import type { Page } from "@playwright/test";
import postgres from "postgres";

export const rolePassword = process.env.DEMO_ROLE_PASSWORD ?? "TerumbuE2E2026!";

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required for Playwright E2E tests.");
  }
  return value;
}

async function withDatabase<T>(run: (sql: ReturnType<typeof postgres>) => Promise<T>) {
  const sql = postgres(databaseUrl(), { max: 1 });

  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

export async function enableDonationPaymentInstructions() {
  return withDatabase(async (sql) => {
    const value = {
      enabled: true,
      methodLabel: "Bank transfer",
      providerName: "Terumbu E2E Bank",
      accountName: "Terumbu E2E",
      accountNumber: "E2E-001",
      swiftCode: "",
      notes: "Automated browser-test payment instructions."
    };

    await sql`
      insert into platform_settings ("key", "value", "updated_at")
      values ('donation_payment_instructions', ${sql.json(value)}, now())
      on conflict ("key") do update
      set "value" = excluded."value", "updated_at" = now()
    `;
  });
}

export async function campaignFixture(slug = "restore-raja-ampat-reefs") {
  return withDatabase(async (sql) => {
    const rows = await sql<{
      campaign_id: string;
      site_id: string;
      campaign_title: string;
    }[]>`
      select
        c.id as campaign_id,
        s.id as site_id,
        c.title as campaign_title
      from campaigns c
      join campaign_impact_sites cis on cis.campaign_id = c.id
      join impact_sites s on s.id = cis.impact_site_id
      where c.slug = ${slug}
      order by s.id
      limit 1
    `;

    if (!rows[0]) {
      throw new Error(`E2E campaign fixture not found for ${slug}.`);
    }

    return rows[0];
  });
}

export async function donationState(donationId: string) {
  return withDatabase(async (sql) => {
    const rows = await sql<{
      id: string;
      status: string;
      user_id: string | null;
      donor_name: string | null;
    }[]>`
      select id, status, user_id, donor_name
      from donations
      where id = ${donationId}
      limit 1
    `;
    return rows[0] ?? null;
  });
}

export async function donationPassportItem(donationId: string) {
  return withDatabase(async (sql) => {
    const rows = await sql<{
      id: string;
      title: string;
      source_id: string | null;
    }[]>`
      select id, title, source_id
      from impact_passport_items
      where source_type = 'donation'
        and source_id = ${donationId}
      limit 1
    `;
    return rows[0] ?? null;
  });
}

export async function evidenceByTitle(title: string) {
  return withDatabase(async (sql) => {
    const rows = await sql<{
      id: string;
      evidence_code: string;
      verification_status: string;
      file_url: string;
    }[]>`
      select id, evidence_code, verification_status, file_url
      from project_evidence
      where title = ${title}
      order by created_at desc
      limit 1
    `;
    return rows[0] ?? null;
  });
}

export async function publicUpdateCountByTitle(title: string) {
  return withDatabase(async (sql) => {
    const rows = await sql<{ count: number }[]>`
      select count(*)::int as count
      from campaign_updates
      where title = ${title}
    `;
    return Number(rows[0]?.count ?? 0);
  });
}

export async function activityVisibilityByTitle(title: string) {
  return withDatabase(async (sql) => {
    const rows = await sql<{
      visibility_status: string;
      verification_status: string | null;
      source_update_id: string | null;
      source_evidence_id: string | null;
    }[]>`
      select visibility_status, verification_status, source_update_id, source_evidence_id
      from campaign_activity
      where title = ${title}
      order by created_at desc
      limit 1
    `;
    return rows[0] ?? null;
  });
}

export async function loginAs(page: Page, email: string, nextPath: string) {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(rolePassword);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login")),
    page.getByRole("button", { name: "Login" }).click()
  ]);
}

export const tinyPng = {
  name: "terumbu-e2e.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
    "base64"
  )
};
