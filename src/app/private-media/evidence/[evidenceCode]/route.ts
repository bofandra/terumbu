import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  campaigns,
  organizationUsers,
  projectEvidence
} from "@/db/schema";
import { getSessionUser, getUserRoles } from "@/lib/auth";
import {
  metadataString,
  privateR2ObjectResponse,
  validPrivateObjectKey
} from "@/lib/private-media";

export const dynamic = "force-dynamic";

function validEvidenceCode(value: string) {
  return /^[A-Za-z0-9-]{8,120}$/.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ evidenceCode: string }> }
) {
  const { evidenceCode } = await context.params;

  if (!validEvidenceCode(evidenceCode)) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  const [evidence] = await db
    .select({
      verificationStatus: projectEvidence.verificationStatus,
      metadata: projectEvidence.metadata,
      organizationId: campaigns.organizationId
    })
    .from(projectEvidence)
    .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
    .where(eq(projectEvidence.evidenceCode, evidenceCode))
    .limit(1);

  if (!evidence) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  if (evidence.verificationStatus !== "verified") {
    const user = await getSessionUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const roles = await getUserRoles(user.id);
    const isAdmin = roles.includes("admin");

    if (!isAdmin) {
      const [membership] = await db
        .select({ id: organizationUsers.id })
        .from(organizationUsers)
        .where(
          and(
            eq(organizationUsers.organizationId, evidence.organizationId),
            eq(organizationUsers.userId, user.id),
            eq(organizationUsers.status, "active")
          )
        )
        .limit(1);

      if (!membership) {
        return Response.json({ error: "Forbidden." }, { status: 403 });
      }
    }
  }

  const objectKey = metadataString(evidence.metadata, "storageObjectKey");
  if (!validPrivateObjectKey(objectKey, "evidence")) {
    return Response.json({ error: "Private media object is unavailable." }, { status: 404 });
  }

  return privateR2ObjectResponse({
    objectKey: objectKey!,
    contentType: metadataString(evidence.metadata, "storageContentType")
  });
}
