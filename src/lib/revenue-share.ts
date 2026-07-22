// Revenue-share payout logic (Section 7).
// A CP season has one or more payees. Each payee is either a PERCENTAGE of the
// in-scope grower-payment pool, or a FIXED_AMOUNT. Never assume a single flat %.

import type { RevenueSharePayee } from "@prisma/client";

export type PayeePayout = {
  payee: RevenueSharePayee;
  /** Computed payout in USD. */
  payout: number;
};

/**
 * Compute payout per payee against a grower-payment pool (USD).
 * PERCENTAGE payees use `rate` as a decimal fraction (0.06 = 6%).
 * FIXED_AMOUNT payees use `rate` as a flat USD figure (pool-independent).
 */
export function computePayouts(
  payees: RevenueSharePayee[],
  growerPaymentPool: number,
): { payouts: PayeePayout[]; total: number } {
  const payouts = payees.map((payee) => {
    const payout =
      payee.basis === "PERCENTAGE"
        ? growerPaymentPool * payee.rate
        : payee.rate;
    return { payee, payout };
  });
  const total = payouts.reduce((sum, p) => sum + p.payout, 0);
  return { payouts, total };
}
