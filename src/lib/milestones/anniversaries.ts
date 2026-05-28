/**
 * Norwegian and English wedding anniversary names.
 * Reference: norsk bryllupsdager / traditional English anniversary gifts.
 */

export const NORSK_BRYLLUPSDAG: ReadonlyMap<number, string> = new Map([
  [1, "Papirbryllup"],
  [2, "Bomullsbryllup"],
  [3, "Lærbryllup"],
  [4, "Fruktbryllup"],
  [5, "Trebryllup"],
  [6, "Sukkerbryllup"],
  [7, "Ullbryllup"],
  [8, "Bronsebryllup"],
  [9, "Porselensbryllup"],
  [10, "Tinnbryllup"],
  [11, "Stålbryllup"],
  [12, "Silkebryllup"],
  [13, "Blondebryllup"],
  [14, "Elfenbensbryllup"],
  [15, "Krystallbryllup"],
  [20, "Kinabryllup"],
  [25, "Sølvbryllup"],
  [30, "Perlebryllup"],
  [35, "Korallbryllup"],
  [40, "Rubinbryllup"],
  [45, "Safirbryllup"],
  [50, "Gullbryllup"],
  [55, "Smaragdbryllup"],
  [60, "Diamantbryllup"],
  [65, "Blå diamantbryllup"],
  [70, "Nådebryllup"],
]);

export const ENGLISH_WEDDING_ANNIVERSARY: ReadonlyMap<number, string> = new Map([
  [1, "Paper"],
  [2, "Cotton"],
  [3, "Leather"],
  [4, "Fruit & flowers"],
  [5, "Wood"],
  [6, "Sugar"],
  [7, "Wool"],
  [8, "Bronze"],
  [9, "Pottery"],
  [10, "Tin"],
  [11, "Steel"],
  [12, "Silk"],
  [13, "Lace"],
  [14, "Ivory"],
  [15, "Crystal"],
  [20, "China"],
  [25, "Silver"],
  [30, "Pearl"],
  [35, "Coral"],
  [40, "Ruby"],
  [45, "Sapphire"],
  [50, "Gold"],
  [55, "Emerald"],
  [60, "Diamond"],
  [65, "Blue sapphire"],
  [70, "Platinum"],
]);

export interface AnniversaryMilestone {
  years: number;
  name: string;
  date: Date;
  daysUntil: number;
}

export function upcomingAnniversaryMilestone(
  anniversaryDateStr: string | null | undefined,
  today: Date = new Date(),
  windowDays = 90,
): AnniversaryMilestone | null {
  if (!anniversaryDateStr) return null;

  const [yStr, mStr, dStr] = anniversaryDateStr.split("-");
  const origYear = Number(yStr);
  const month = Number(mStr) - 1;
  const day = Number(dStr);

  if (!origYear || Number.isNaN(month) || Number.isNaN(day)) return null;

  const todayYear = today.getUTCFullYear();
  if (origYear < 1800 || origYear > todayYear) return null;

  const todayMidnight = Date.UTC(todayYear, today.getUTCMonth(), today.getUTCDate());
  const windowEndMs = todayMidnight + windowDays * 24 * 60 * 60 * 1000;

  for (const candidateYear of [todayYear, todayYear + 1]) {
    const years = candidateYear - origYear;
    if (years <= 0) continue;

    const name = NORSK_BRYLLUPSDAG.get(years);
    if (!name) continue;

    const milestoneMs = Date.UTC(candidateYear, month, day);
    const milestoneDate = new Date(milestoneMs);
    const daysUntil = Math.round((milestoneMs - todayMidnight) / (24 * 60 * 60 * 1000));

    if (milestoneMs >= todayMidnight && milestoneMs <= windowEndMs) {
      return { years, name, date: milestoneDate, daysUntil };
    }
  }

  return null;
}

export function currentAnniversaryName(
  anniversaryDateStr: string | null | undefined,
  today: Date = new Date(),
): { years: number; name: string } | null {
  if (!anniversaryDateStr) return null;

  const origYear = Number(anniversaryDateStr.split("-")[0]);
  if (!origYear || origYear < 1800) return null;

  const years = today.getUTCFullYear() - origYear;
  if (years <= 0) return null;

  const name = NORSK_BRYLLUPSDAG.get(years);
  return name ? { years, name } : null;
}

export function weddingAnniversaryYears(
  anniversaryDateStr: string,
  today: Date = new Date(),
): number | null {
  const origYear = Number(anniversaryDateStr.split("-")[0]);
  if (!origYear || origYear < 1800) return null;
  let years = today.getFullYear() - origYear;
  const month = Number(anniversaryDateStr.slice(5, 7)) - 1;
  const day = Number(anniversaryDateStr.slice(8, 10));
  if (today.getMonth() < month || (today.getMonth() === month && today.getDate() < day)) {
    years--;
  }
  return years > 0 ? years : null;
}

export function anniversaryMilestoneDetail(
  eventDate: string,
  today: Date = new Date(),
): { years: number; norwegian: string | null; english: string | null } | null {
  const upcoming = upcomingAnniversaryMilestone(eventDate, today, 365);
  const current = currentAnniversaryName(eventDate, today);
  const years = upcoming?.years ?? current?.years ?? weddingAnniversaryYears(eventDate, today);
  if (years == null) return null;

  return {
    years,
    norwegian: NORSK_BRYLLUPSDAG.get(years) ?? null,
    english: ENGLISH_WEDDING_ANNIVERSARY.get(years) ?? null,
  };
}
