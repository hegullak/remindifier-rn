import { BIRTHDAY_SENTINEL_YEAR } from "@/lib/red-letter-day";

/** Full years since birthday; null when year unknown or missing. */
export function computeAgeFromBirthday(
  iso: string | null | undefined,
  yearKnown: boolean,
): number | null {
  if (!iso?.trim() || !yearKnown) return null;
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const birthYear = Number(match[1]);
  if (birthYear === Number(BIRTHDAY_SENTINEL_YEAR)) return null;
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const hadBirthday =
    today.getMonth() > month || (today.getMonth() === month && today.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

const PICKER_DISPLAY_YEAR = 2000;

export function isoToPickerDate(iso: string, yearKnown: boolean): Date {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(PICKER_DISPLAY_YEAR, 0, 1);
  const year = yearKnown ? Number(match[1]) : PICKER_DISPLAY_YEAR;
  return new Date(year, Number(match[2]) - 1, Number(match[3]));
}

export function pickerDateToIso(date: Date, yearKnown: boolean): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = yearKnown ? String(date.getFullYear()) : BIRTHDAY_SENTINEL_YEAR;
  return `${year}-${month}-${day}`;
}

export function applyYearKnownToIso(iso: string, yearKnown: boolean): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  if (yearKnown) {
    const year = match[1] === BIRTHDAY_SENTINEL_YEAR ? String(PICKER_DISPLAY_YEAR) : match[1];
    return `${year}-${match[2]}-${match[3]}`;
  }
  return `${BIRTHDAY_SENTINEL_YEAR}-${match[2]}-${match[3]}`;
}

export function formatBirthdayLabel(iso: string, yearKnown: boolean, locale: "en" | "no"): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(
    yearKnown ? Number(match[1]) : PICKER_DISPLAY_YEAR,
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return date.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", {
    day: "numeric",
    month: "long",
    ...(yearKnown ? { year: "numeric" } : {}),
  });
}
