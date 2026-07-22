import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ACRES_PER_HECTARE = 2.47105;

export function hectaresToAcres(ha: number | null | undefined): number | null {
  if (ha == null) return null;
  return round(ha * ACRES_PER_HECTARE, 2);
}

export function acresToHectares(ac: number | null | undefined): number | null {
  if (ac == null) return null;
  return round(ac / ACRES_PER_HECTARE, 2);
}

export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function formatNumber(n: number | null | undefined, dp = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(fraction: number | null | undefined, dp = 0): string {
  if (fraction == null) return "—";
  return `${round(fraction * 100, dp).toLocaleString("en-US")}%`;
}
