import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  expeditionBookingPayments,
  paymentTransactions
} from "@/db/schema";
import { getSessionUser, getUserRoles } from "@/lib/auth";
import {
  metadataString,
  privateR2ObjectResponse,
  validPrivateObjectKey
} from "@/lib/private-media";

export const dynamic = "force-dynamic";

function validReference(value: string) {
  return /^[A-Za-z0-9-]{8,255}$/.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; providerReference: string }> }
) {
  const { kind, providerReference } = await context.params;

  if (!["donation", "expedition"].includes(kind) || !validReference(providerReference)) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const roles = await getUserRoles(user.id);
  if (!roles.includes("admin")) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const row =
    kind === "donation"
      ? (
          await db
            .select({ payload: paymentTransactions.payload })
            .from(paymentTransactions)
            .where(eq(paymentTransactions.providerReference, providerReference))
            .limit(1)
        )[0]
      : (
          await db
            .select({ payload: expeditionBookingPayments.payload })
            .from(expeditionBookingPayments)
            .where(eq(expeditionBookingPayments.providerReference, providerReference))
            .limit(1)
        )[0];

  if (!row) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  const objectKey = metadataString(row.payload, "paymentProofObjectKey");
  if (!validPrivateObjectKey(objectKey, "payment-proof")) {
    return Response.json({ error: "Private media object is unavailable." }, { status: 404 });
  }

  return privateR2ObjectResponse({
    objectKey: objectKey!,
    contentType: metadataString(row.payload, "paymentProofContentType")
  });
}
