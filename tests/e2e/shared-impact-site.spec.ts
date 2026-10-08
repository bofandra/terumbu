import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("a shared impact site does not borrow verified evidence from another campaign", async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  let linkId: string | null = null;

  try {
    const [source] = await sql<{ campaign_id: string; site_id: string; site_name: string }[]>`
      select c.id as campaign_id, s.id as site_id, s.name as site_name
      from campaigns c
      join campaign_impact_sites cis on cis.campaign_id = c.id
      join impact_sites s on s.id = cis.impact_site_id
      where c.slug = 'restore-raja-ampat-reefs'
      order by cis.is_primary desc
      limit 1
    `;
    const [target] = await sql<{ id: string }[]>`
      select id from campaigns where slug = 'mangrove-shield-bali' limit 1
    `;
    expect(source?.site_id).toBeTruthy();
    expect(target?.id).toBeTruthy();

    const [baseline] = await sql<{ evidence_count: number }[]>`
      select count(*)::int as evidence_count from project_evidence
      where campaign_id = ${source.campaign_id} and impact_site_id = ${source.site_id}
        and verification_status = 'verified'
    `;
    expect(baseline.evidence_count).toBeGreaterThan(0);

    const [link] = await sql<{ id: string }[]>`
      insert into campaign_impact_sites (campaign_id, impact_site_id, is_primary)
      values (${target.id}, ${source.site_id}, false)
      on conflict (campaign_id, impact_site_id) do nothing returning id
    `;
    expect(link?.id).toBeTruthy();
    linkId = link.id;

    await page.goto("/campaigns/mangrove-shield-bali");
    const sharedSite = page.getByText(source.site_name, { exact: true }).first().locator("..");
    await expect(sharedSite).toBeVisible();
    // The target campaign has no evidence for this shared site.
    await expect(sharedSite).toContainText(/\/\s*0\s/);

    await page.goto("/campaigns/restore-raja-ampat-reefs");
    const sourceSite = page.getByText(source.site_name, { exact: true }).first().locator("..");
    await expect(sourceSite).toBeVisible();
    await expect(sourceSite).not.toContainText(/\/\s*0\s/);
  } finally {
    if (linkId) {
      await sql`delete from campaign_impact_sites where id = ${linkId}`;
    }
    await sql.end();
  }
});

test("national impact map renders one pin for a site shared by two campaigns", async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  let linkId: string | null = null;

  try {
    const [site] = await sql<{ id: string; name: string }[]>`
      select s.id, s.name from campaigns c
      join campaign_impact_sites cis on cis.campaign_id = c.id
      join impact_sites s on s.id = cis.impact_site_id
      where c.slug = 'restore-raja-ampat-reefs'
      order by cis.is_primary desc limit 1
    `;
    const [target] = await sql<{ id: string }[]>`
      select id from campaigns where slug = 'mangrove-shield-bali' limit 1
    `;
    expect(site?.id).toBeTruthy();
    expect(target?.id).toBeTruthy();

    const [link] = await sql<{ id: string }[]>`
      insert into campaign_impact_sites (campaign_id, impact_site_id, is_primary)
      values (${target.id}, ${site.id}, false)
      on conflict (campaign_id, impact_site_id) do nothing returning id
    `;
    expect(link?.id).toBeTruthy();
    linkId = link.id;

    const [recordCount] = await sql<{ total: number }[]>`
      select count(*)::int as total from project_evidence e
      join campaign_impact_sites cis on cis.impact_site_id = e.impact_site_id
        and cis.campaign_id = e.campaign_id
      join campaigns c on c.id = cis.campaign_id
      where e.impact_site_id = ${site.id} and c.status in ('published', 'funded', 'completed')
    `;

    await page.goto("/impact-map");
    const pin = page.getByRole("button", { name: `Show impact details for ${site.name}` });
    await expect(pin).toHaveCount(1);
    await expect(page.locator(`button[title="${site.name}"]`)).toHaveCount(1);
    await pin.click();
    await expect(page.getByText(`${recordCount.total} activity records`, { exact: true }).first()).toBeVisible();
    await expect(page.locator('a[href="/campaigns/restore-raja-ampat-reefs"]').filter({ hasText: "Donate" })).toBeVisible();
  } finally {
    if (linkId) {
      await sql`delete from campaign_impact_sites where id = ${linkId}`;
    }
    await sql.end();
  }
});
