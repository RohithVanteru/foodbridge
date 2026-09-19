export function sameServiceDay(a: Date, b: Date) {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.SERVICE_TIMEZONE || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  return Number.isFinite(a.getTime()) && Number.isFinite(b.getTime()) && format.format(a) === format.format(b);
}
