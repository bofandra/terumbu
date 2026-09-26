"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { platformSettings } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export const DONATION_PAYMENT_INSTRUCTIONS_KEY = "donation_payment_instructions";

export type DonationPaymentInstructions = {
  enabled: boolean;
  methodLabel: string;
  providerName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
  notes: string;
};

const emptyInstructions: DonationPaymentInstructions = {
  enabled: false,
  methodLabel: "Bank transfer",
  providerName: "",
  accountName: "",
  accountNumber: "",
  swiftCode: "",
  notes: ""
};

function normalize(value: unknown): DonationPaymentInstructions {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    enabled: row.enabled === true,
    methodLabel: String(row.methodLabel ?? emptyInstructions.methodLabel).trim(),
    providerName: String(row.providerName ?? "").trim(),
    accountName: String(row.accountName ?? "").trim(),
    accountNumber: String(row.accountNumber ?? "").trim(),
    swiftCode: String(row.swiftCode ?? "").trim(),
    notes: String(row.notes ?? "").trim()
  };
}

export async function getDonationPaymentInstructions() {
  const [setting] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, DONATION_PAYMENT_INSTRUCTIONS_KEY))
    .limit(1);

  return normalize(setting?.value);
}

export async function updateDonationPaymentInstructionsAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/payment-instructions");
  const now = new Date();
  const value = normalize({
    enabled: formData.get("enabled") === "on",
    methodLabel: formData.get("methodLabel"),
    providerName: formData.get("providerName"),
    accountName: formData.get("accountName"),
    accountNumber: formData.get("accountNumber"),
    swiftCode: formData.get("swiftCode"),
    notes: formData.get("notes")
  });

  if (value.enabled && (!value.methodLabel || !value.providerName || !value.accountName || !value.accountNumber)) {
    redirect("/admin/payment-instructions?error=incomplete");
  }

  await db
    .insert(platformSettings)
    .values({
      key: DONATION_PAYMENT_INSTRUCTIONS_KEY,
      value,
      updatedByUserId: user.id,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedByUserId: user.id, updatedAt: now }
    });

  revalidatePath("/admin/payment-instructions");
  revalidatePath("/checkout/donation");
  redirect("/admin/payment-instructions?saved=1");
}
