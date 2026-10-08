import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("concurrent corporate funding does not double count, and forged program access is rejected", async ({ browser }) => {
  test.setTimeout(120_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const a = await browser.newContext();
  const b = await browser.newContext();
  let programId: string | null = null;
  let foreignAccountId: string | null = null;
  let foreignProgramId: string | null = null;
  let campaignId: string | null = null;
  let originalCampaignRaised: number | null = null;

  try {
    const [actor] = await sql<{ id: string; account_id: string }[]>`
      select u.id, cp.corporate_account_id as account_id
      from users u join corporate_permissions cp on cp.user_id = u.id
      where u.email = 'corporate.demo@terumbu.eco'
      order by cp.created_at limit 1
    `;
    expect(actor?.id).toBeTruthy();

    const unique = randomUUID().slice(0, 10);
    const [program] = await sql<{ id: string }[]>`
      insert into corporate_programs
        (corporate_account_id, name, slug, starts_at, ends_at, budget_amount, currency, status)
      values (${actor.account_id}, 'E2E Corporate Funding', ${"e2e-funding-" + unique},
        now() - interval '1 day', now() + interval '1 year', 10000, 'IDR', 'active')
      returning id
    `;
    programId = program.id;

    const [foreignAccount] = await sql<{ id: string }[]>`
      insert into corporate_accounts (name, slug)
      values ('E2E Foreign Corporate', ${"e2e-foreign-" + unique}) returning id
    `;
    foreignAccountId = foreignAccount.id;
    const [foreignProgram] = await sql<{ id: string }[]>`
      insert into corporate_programs
        (corporate_account_id, name, slug, starts_at, ends_at, budget_amount, currency, status)
      values (${foreignAccountId}, 'E2E Foreign Program', ${"e2e-foreign-program-" + unique},
        now() - interval '1 day', now() + interval '1 year', 10000, 'IDR', 'active')
      returning id
    `;
    foreignProgramId = foreignProgram.id;

    const firstPage = await a.newPage();
    const secondPage = await b.newPage();
    await Promise.all([
      loginAs(firstPage, "corporate.demo@terumbu.eco", "/corporate/donations"),
      loginAs(secondPage, "corporate.demo@terumbu.eco", "/corporate/donations")
    ]);

    const formOne = firstPage.locator('form:has(button:has-text("Save donation"))');
    const formTwo = secondPage.locator('form:has(button:has-text("Save donation"))');
    await expect(formOne).toBeVisible();
    await expect(formTwo).toBeVisible();
    campaignId = await formOne.locator('select[name="campaignId"]').inputValue();
    expect(campaignId).toBeTruthy();
    const [before] = await sql<{ raised: string; currency: string }[]>`
      select raised_amount::text as raised, currency from campaigns where id = ${campaignId}
    `;
    originalCampaignRaised = Number(before.raised);
    await sql`update corporate_programs set currency = ${before.currency} where id = ${programId}`;

    // Browser form hidden inputs are mutable; access checks must run on the server.
    await formOne.locator('input[name="programId"]').evaluate((node, value) => {
      (node as HTMLInputElement).value = value;
    }, foreignProgramId);
    await formOne.locator('input[name="allocationAmount"]').fill("37");
    await formOne.locator('input[name="countsTowardCampaignGoal"]').check();
    await Promise.all([
      firstPage.waitForURL(/\/corporate\/donations\?error=permission/),
      formOne.getByRole("button", { name: "Save donation" }).click()
    ]);
    const [denied] = await sql<{ total: number }[]>`
      select count(*)::int as total from corporate_contributions
      where program_id = ${foreignProgramId}
    `;
    expect(denied.total).toBe(0);

    // The numeric raised total cannot mix USD with IDR when a malicious form
    // explicitly opts into public-goal counting.
    const wrongCurrency = before.currency.toUpperCase() === "USD" ? "IDR" : "USD";
    await sql`update corporate_programs set currency = ${wrongCurrency} where id = ${programId}`;
    await firstPage.goto("/corporate/donations");
    const wrongCurrencyForm = firstPage.locator('form:has(button:has-text("Save donation"))');
    await wrongCurrencyForm.locator('input[name="programId"]').evaluate((node, value) => {
      (node as HTMLInputElement).value = value;
    }, programId);
    await wrongCurrencyForm.locator('input[name="allocationAmount"]').fill("37");
    await wrongCurrencyForm.locator('input[name="countsTowardCampaignGoal"]').check();
    await Promise.all([
      firstPage.waitForURL(/\/corporate\/donations\?error=currency/),
      wrongCurrencyForm.getByRole("button", { name: "Save donation" }).click()
    ]);
    const [currencyDenied] = await sql<{ total: number }[]>`
      select count(*)::int as total from corporate_contributions where program_id = ${programId}
    `;
    expect(currencyDenied.total).toBe(0);
    await sql`update corporate_programs set currency = ${before.currency} where id = ${programId}`;

    await firstPage.goto("/corporate/donations");
    const changedForm = firstPage.locator('form:has(button:has-text("Save donation"))');
    for (const [form, amount] of [[changedForm, "37"], [formTwo, "71"]] as const) {
      await form.locator('input[name="programId"]').evaluate((node, value) => {
        (node as HTMLInputElement).value = value;
      }, programId);
      await form.locator('input[name="allocationAmount"]').fill(amount);
      await form.locator('input[name="countsTowardCampaignGoal"]').check();
    }
    await Promise.all([
      Promise.all([
        firstPage.waitForURL(/\/corporate\/donations\?saved=project/),
        changedForm.getByRole("button", { name: "Save donation" }).click()
      ]),
      Promise.all([
        secondPage.waitForURL(/\/corporate\/donations\?saved=project/),
        formTwo.getByRole("button", { name: "Save donation" }).click()
      ])
    ]);

    const [contribution] = await sql<{ amount: string; status: string; counts_toward_campaign_goal: boolean; total: number }[]>`
      select c.amount::text, c.status, c.counts_toward_campaign_goal,
        (select count(*)::int from corporate_contributions
          where program_id = ${programId} and campaign_id = ${campaignId} and contribution_type = 'csr') as total
      from corporate_contributions c
      where c.program_id = ${programId} and c.campaign_id = ${campaignId} and c.contribution_type = 'csr'
    `;
    expect(contribution.total).toBe(1);
    expect(["37", "71"]).toContain(String(Number(contribution.amount)));
    expect(contribution.status).toBe("committed");
    expect(contribution.counts_toward_campaign_goal).toBe(true);

    const [after] = await sql<{ raised: string }[]>`
      select raised_amount::text as raised from campaigns where id = ${campaignId}
    `;
    expect(Number(after.raised) - originalCampaignRaised).toBeCloseTo(Number(contribution.amount), 2);

    const [portfolio] = await sql<{ total: number; allocated: string }[]>`
      select count(*)::int as total, max(allocation_amount)::text as allocated
      from corporate_project_portfolio
      where program_id = ${programId} and campaign_id = ${campaignId}
    `;
    expect(portfolio.total).toBe(1);
    expect(Number(portfolio.allocated)).toBe(Number(contribution.amount));

    const [logs] = await sql<{ total: number }[]>`
      select count(*)::int as total from admin_audit_logs
      where action = 'corporate.project.contribution_recorded'
        and metadata->>'programId' = ${programId}
    `;
    expect(logs.total).toBe(2);
  } finally {
    await Promise.all([a.close(), b.close()]);
    if (programId) {
      if (campaignId) {
        const [current] = await sql<{ amount: string; status: string; counts_toward_campaign_goal: boolean }[]>`
          select amount::text, status, counts_toward_campaign_goal
          from corporate_contributions where program_id = ${programId} and campaign_id = ${campaignId} and contribution_type = 'csr'
        `;
        if (current?.counts_toward_campaign_goal && ["committed", "disbursed", "verified"].includes(current.status)) {
          await sql`update campaigns set raised_amount = greatest(0, raised_amount - ${current.amount}::numeric) where id = ${campaignId}`;
        }
      }
      await sql`delete from admin_audit_logs where action = 'corporate.project.contribution_recorded' and metadata->>'programId' = ${programId}`;
      await sql`delete from corporate_programs where id = ${programId}`;
    }
    if (foreignProgramId) await sql`delete from corporate_programs where id = ${foreignProgramId}`;
    if (foreignAccountId) await sql`delete from corporate_accounts where id = ${foreignAccountId}`;
    await sql.end();
  }
});
