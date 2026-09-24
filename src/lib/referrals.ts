import { createHash } from "node:crypto";

export function referralCodeForUser(userId: string) {
  return createHash("sha256").update(`terumbu-referral:${userId}`).digest("hex").slice(0, 12);
}

export type ReferralReward = {
  key: string;
  label: string;
  threshold: number;
  description: string;
};

export const referralRewards: ReferralReward[] = [
  { key: "connector", label: "Ocean Connector", threshold: 1, description: "One confirmed traveler joined through your invite." },
  { key: "ambassador", label: "Reef Ambassador", threshold: 3, description: "Three confirmed travelers joined through your invites." },
  { key: "guide", label: "Impact Guide", threshold: 5, description: "Five confirmed travelers joined through your invites." }
];

export function referralRewardProgress(confirmedTravelers: number) {
  const unlocked = referralRewards.filter((reward) => confirmedTravelers >= reward.threshold);
  const next = referralRewards.find((reward) => confirmedTravelers < reward.threshold) ?? null;

  return {
    unlocked,
    next,
    remaining: next ? Math.max(0, next.threshold - confirmedTravelers) : 0
  };
}
