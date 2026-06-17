import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarMonths, startOfMonth } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `Rs. ${(amount ?? 0).toLocaleString("en-PK")}`;
}

export function formatMonth(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getMonthsSinceJoining(joinDate: Date): number {
  const now = startOfMonth(new Date());
  const joined = startOfMonth(new Date(joinDate));
  return differenceInCalendarMonths(now, joined) + 1;
}

export function calculateExpectedPayment(joinDate: Date, monthlyFee: number): number {
  return getMonthsSinceJoining(joinDate) * monthlyFee;
}

export function calculateOutstanding(joinDate: Date, monthlyFee: number, totalPaid: number): number {
  const expected = calculateExpectedPayment(joinDate, monthlyFee);
  return Math.max(0, expected - totalPaid);
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getMonthRange(startDate: Date): Array<{ month: number; year: number }> {
  const months: Array<{ month: number; year: number }> = [];
  const now = new Date();
  let current = startOfMonth(new Date(startDate));
  const end = startOfMonth(now);

  while (current <= end) {
    months.push({ month: current.getMonth() + 1, year: current.getFullYear() });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return months;
}

export function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
