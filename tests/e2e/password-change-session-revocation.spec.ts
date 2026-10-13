import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { createPasswordHash, verifyPassword } from "../../src/lib/password";
import { rolePassword, loginAs } from "./support";

test("changing account password revokes other browsers but keeps the current browser signed in", async ({ browser }) => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const email = "sessions-" + randomUUID() + "@example.invalid";
  const newPassword = "NewTerumbuE2E#" + randomUUID().slice(0, 12);
  const first = await browser.newContext();
  const second = await browser.newContext();
  let userId: string | null = null;

  try {
    const [user] = await sql<{ id: string }[]>`
      insert into users (email, name, password_hash, email_verified_at)
      values (${email}, 'Session Security E2E', ${createPasswordHash(rolePassword)}, now())
      returning id
    `;
    userId = user.id;

    const primaryPage = await first.newPage();
    const otherPage = await second.newPage();
    await loginAs(primaryPage, email, "/dashboard/settings");
    await loginAs(otherPage, email, "/dashboard/settings");
    await expect(primaryPage).toHaveURL(/\/dashboard\/settings/);
    await expect(otherPage).toHaveURL(/\/dashboard\/settings/);

    const before = await sql<{ count: number }[]>`
      select count(*)::int as count from sessions where user_id = ${userId}
    `;
    expect(Number(before[0].count)).toBe(2);

    await primaryPage.locator('input[name="currentPassword"]').fill(rolePassword);
    await primaryPage.locator('input[name="nextPassword"]').fill(newPassword);
    await primaryPage.locator('input[name="confirmPassword"]').fill(newPassword);
    await Promise.all([
      primaryPage.waitForURL(/\/dashboard\/settings\?saved=password/),
      primaryPage.locator('form:has(input[name="currentPassword"]) button[type="submit"]').click()
    ]);

    const after = await sql<{ count: number }[]>`
      select count(*)::int as count from sessions where user_id = ${userId}
    `;
    expect(Number(after[0].count)).toBe(1);

    const [updatedUser] = await sql<{ password_hash: string }[]>`
      select password_hash from users where id = ${userId}
    `;
    expect(verifyPassword(rolePassword, updatedUser.password_hash)).toBe(false);
    expect(verifyPassword(newPassword, updatedUser.password_hash)).toBe(true);

    // Current browser remains authorized while an older other-device session
    // is denied by server-side session lookup (not just a cleared cookie).
    await primaryPage.reload();
    await expect(primaryPage).toHaveURL(/\/dashboard\/settings/);
    await otherPage.goto("/dashboard/settings");
    await expect(otherPage).toHaveURL(/\/login\?next=/);
  } finally {
    await first.close();
    await second.close();
    if (userId) await sql`delete from users where id = ${userId}`;
    await sql.end();
  }
});
