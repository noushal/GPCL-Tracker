export function calculateSaleEligibility(seasonStr, windowStr) {
  const currentSeasonNum = parseInt(String(seasonStr).replace(/\D/g, ""), 10);
  if (isNaN(currentSeasonNum)) return "Unknown";
  const nextSeasonNum = currentSeasonNum + 1;
  if (windowStr && windowStr.includes("Winter")) {
    return `Season ${nextSeasonNum} Winter Transfer`;
  }
  return `Season ${nextSeasonNum} Summer Transfer (Pre-Season)`;
}

export function formatCurrency(amount) {
  if (!amount || isNaN(amount)) return "€0";
  return "€" + Number(amount).toLocaleString();
}
