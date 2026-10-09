import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { transitionCorporateReport } from "../../src/lib/corporate-report-transitions";

test("corporate report lifecycle is atomic, idempotent and scoped to its program", async () => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  let reportId: string | null = null;

  try {
    const [actor] = await sql<{ user_id: string; program_id: string }[]>`
      select cp.user_id, p.id as program_id
      from users u
      join corporate_permissions cp on cp.user_id = u.id
      join corporate_programs p on p.corporate_account_id = cp.corporate_account_id
      where u.email = 'corporate.demo@terumbu.eco'
      order by p.created_at desc limit 1
    `;
    expect(actor?.user_id).toBeTruthy();
    const [reviewer] = await sql<{ id: string }[]>`
      select id from users where email = 'user.demo@terumbu.eco' limit 1
    `;
    expect(reviewer?.id).toBeTruthy();
    const exportCode = `E2E-CORP-STATE-${randomUUID()}`;
    const snapshot = { metrics: { totalAllocated: 123 }, portfolio: [], evidence: [] };
    const generationMetadata = JSON.stringify({ generationSnapshot: snapshot });
    const [report] = await sql<{ id: string }[]>`
      insert into corporate_report_exports (program_id, requested_by_user_id, export_code, report_type, export_format, status, generated_at, metadata)
      values (${actor.program_id}, ${actor.user_id}, ${exportCode}, 'esg', 'pdf', 'generated', now(), ${generationMetadata}::jsonb) returning id
    `;
    reportId = report.id;

    const [initial] = await sql<{ metadata: Record<string, unknown>; snapshot_type: string | null }[]>`
      select metadata, jsonb_typeof(metadata->'generationSnapshot') as snapshot_type
      from corporate_report_exports where id = ${reportId}
    `;
    expect(initial.snapshot_type, JSON.stringify(initial.metadata)).toBe("object");

    const scoped = {
      reportId,
      programId: actor.program_id,
      actorUserId: actor.user_id,
      exportCode
    };

    // Supplying a different program ID cannot change another program's report.
    const wrongProgram = await transitionCorporateReport({
      ...scoped,
      programId: randomUUID(),
      expectedStatus: "generated",
      nextStatus: "review"
    });
    expect(wrongProgram).toBe(false);

    expect(await transitionCorporateReport({
      ...scoped,
      expectedStatus: "generated",
      nextStatus: "published"
    })).toBe(false);

    const submits = await Promise.all([
      transitionCorporateReport({ ...scoped, expectedStatus: "generated", nextStatus: "review" }),
      transitionCorporateReport({ ...scoped, expectedStatus: "generated", nextStatus: "review" })
    ]);
    expect(submits.filter(Boolean)).toHaveLength(1);

    expect(await transitionCorporateReport({
      ...scoped,
      expectedStatus: "review",
      nextStatus: "approved"
    })).toBe(false);

    const approvals = await Promise.all([
      transitionCorporateReport({ ...scoped, actorUserId: reviewer.id, expectedStatus: "review", nextStatus: "approved" }),
      transitionCorporateReport({ ...scoped, actorUserId: reviewer.id, expectedStatus: "review", nextStatus: "approved" })
    ]);
    expect(approvals.filter(Boolean)).toHaveLength(1);

    const [ready] = await sql<{ status: string; snapshot_type: string | null }[]>`
      select status, jsonb_typeof(metadata->'generationSnapshot') as snapshot_type
      from corporate_report_exports where id = ${reportId}
    `;
    expect(ready.status).toBe("approved");
    expect(ready.snapshot_type).toBe("object");

    const publicSlug = `e2e-corporate-report-${randomUUID()}`;
    const published = await Promise.all([
      transitionCorporateReport({ ...scoped, expectedStatus: "approved", nextStatus: "published", publicSlug }),
      transitionCorporateReport({ ...scoped, expectedStatus: "approved", nextStatus: "published", publicSlug })
    ]);
    expect(published.filter(Boolean)).toHaveLength(1);

    const [result] = await sql<{
      status: string;
      public_slug: string;
      approved_by_user_id: string;
      approved_at: Date;
      published_at: Date;
    }[]>`
      select status, public_slug, approved_by_user_id, approved_at, published_at
      from corporate_report_exports where id = ${reportId}
    `;
    expect(result.status).toBe("published");
    expect(result.public_slug).toBe(publicSlug);
    expect(result.approved_by_user_id).toBe(reviewer.id);
    expect(result.approved_at).toBeTruthy();
    expect(result.published_at).toBeTruthy();
    const [stored] = await sql<{ snapshot: { metrics: { totalAllocated: number } } }[]>`
      select metadata->'publicSnapshot' as snapshot from corporate_report_exports where id = ${reportId}
    `;
    expect(stored.snapshot.metrics.totalAllocated).toBe(123);

    const [logs] = await sql<{ total: number; distinct_actions: number }[]>`
      select count(*)::int as total, count(distinct action)::int as distinct_actions
      from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id = ${reportId}
    `;
    expect(logs.total).toBe(3);
    expect(logs.distinct_actions).toBe(3);
  } finally {
    if (reportId) {
      await sql`delete from admin_audit_logs where entity_type = 'corporate_report_exports' and entity_id = ${reportId}`;
      await sql`delete from corporate_report_exports where id = ${reportId}`;
    }
    await sql.end();
  }
});
