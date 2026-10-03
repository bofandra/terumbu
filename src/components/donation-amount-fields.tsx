"use client";

import { useState } from "react";

import type { SupportedLocale } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

type DonationAmountFieldsProps = {
  amounts: number[];
  defaultAmount: number;
  currency: string;
  defaultCustomAmount?: number | string;
  locale?: SupportedLocale;
};

export function DonationAmountFields({
  amounts,
  defaultAmount,
  currency,
  defaultCustomAmount = "",
  locale = "en"
}: DonationAmountFieldsProps) {
  const initialCustomAmount = String(defaultCustomAmount).replace(/[^0-9.]/g, "");
  const [selectedAmount, setSelectedAmount] = useState(defaultAmount);
  const [customAmount, setCustomAmount] = useState(initialCustomAmount);
  const [isCustomAmountSelected, setIsCustomAmountSelected] = useState(initialCustomAmount.length > 0);
  const labels =
    locale === "id"
      ? {
          amount: "Nominal donasi",
          other: "Nominal lain",
          otherHelp: "Masukkan nominal berbeda",
          custom: "Nominal khusus",
          placeholder: "Masukkan nominal lain"
        }
      : {
          amount: "Donation amount",
          other: "Other amount",
          otherHelp: "Enter another amount",
          custom: "Custom amount",
          placeholder: "Enter another amount"
        };

  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="text-sm font-semibold text-ocean-900">{labels.amount}</legend>
      <input type="hidden" name="amount" value={isCustomAmountSelected ? "0" : selectedAmount} />
      <div className="grid grid-cols-2 gap-3">
        {amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            aria-pressed={!isCustomAmountSelected && selectedAmount === amount}
            className={`min-w-0 break-words rounded-xl border px-4 py-4 text-left text-sm font-bold transition [overflow-wrap:anywhere] ${
              !isCustomAmountSelected && selectedAmount === amount
                ? "border-coral-500 bg-coral-100/40 text-ocean-900"
                : "border-ocean-900/10 text-ocean-900 hover:border-coral-500"
            }`}
            onClick={() => {
              setSelectedAmount(amount);
              setCustomAmount("");
              setIsCustomAmountSelected(false);
            }}
          >
            {formatCurrency(amount, currency)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isCustomAmountSelected}
          className={`rounded-xl border px-4 py-4 text-left text-sm font-bold transition ${
            isCustomAmountSelected
              ? "border-coral-500 bg-coral-100/40 text-ocean-900"
              : "border-ocean-900/10 text-ocean-900 hover:border-coral-500"
          }`}
          onClick={() => {
            if (!isCustomAmountSelected) {
              setCustomAmount("");
            }
            setIsCustomAmountSelected(true);
          }}
        >
          {labels.other}
          <span className="mt-1 block text-xs font-semibold text-ocean-900/56">{labels.otherHelp}</span>
        </button>
      </div>
      {isCustomAmountSelected ? (
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
          {labels.custom}
          <input
            name="customAmount"
            inputMode="numeric"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder={labels.placeholder}
            required
            className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
          />
        </label>
      ) : (
        <input type="hidden" name="customAmount" value="" />
      )}
    </fieldset>
  );
}
