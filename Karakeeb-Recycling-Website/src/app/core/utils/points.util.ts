export type PointsTag = "redeem" | "cashback" | "earn" | "bonus" | "deduct";

export const TAG_COLORS: Record<PointsTag, string> = {
  redeem: "bg-purple-100 text-purple-800 border-purple-200",
  cashback: "bg-orange-100 text-orange-800 border-orange-200",
  earn: "bg-green-100 text-green-800 border-green-200",
  bonus: "bg-blue-100 text-blue-800 border-blue-200",
  deduct: "bg-red-100 text-red-800 border-red-200",
};

export function categorizeEntry(reason: string, points: number): PointsTag {
  if (points < 0) return "deduct";

  const message = reason.toLowerCase();
  if (message.includes("cashback")) return "cashback";
  if (message.includes("redeem") || message.includes("voucher")) return "redeem";
  if (
    message.includes("bonus") ||
    message.includes("welcome") ||
    message.includes("referral")
  ) {
    return "bonus";
  }
  return "earn";
}

export function formatDate(timestamp: string, locale: string = "en-US"): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid Date";
  }
}

