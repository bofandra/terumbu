"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  supportedDisplayCurrencies,
  supportedLocales,
  type DisplayCurrency,
  type SupportedLocale
} from "@/lib/user-preferences";

export async function setPublicPreferencesAction(formData: FormData) {
  const localeRaw = String(formData.get("locale") ?? "");
  const currencyRaw = String(formData.get("currency") ?? "");
  const locale = supportedLocales.includes(localeRaw as SupportedLocale) ? (localeRaw as SupportedLocale) : "en";
  const currency = supportedDisplayCurrencies.includes(currencyRaw as DisplayCurrency) ? (currencyRaw as DisplayCurrency) : "USD";
  const store = await cookies();

  store.set("terumbu_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false
  });
  store.set("terumbu_currency", currency, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false
  });

  revalidatePath("/", "layout");
}
