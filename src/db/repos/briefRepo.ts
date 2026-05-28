import { asc } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { briefRedLetterDays, briefSchedule } from "@/db/schema";

export interface BriefScheduleItem {
  id: string;
  time: string;
  title: string;
  note: string;
}

export interface BriefRedLetterDayItem {
  id: string;
  personName: string;
  headline: string;
  timing: string;
}

export async function listBriefSchedule(userId: string): Promise<BriefScheduleItem[]> {
  const db = await getDrizzleDbForUser(userId);
  const rows = await db
    .select({
      id: briefSchedule.id,
      time: briefSchedule.timeLabel,
      title: briefSchedule.title,
      note: briefSchedule.note,
    })
    .from(briefSchedule)
    .orderBy(asc(briefSchedule.timeLabel));

  return rows;
}

export async function listBriefRedLetterDays(userId: string): Promise<BriefRedLetterDayItem[]> {
  const db = await getDrizzleDbForUser(userId);
  const rows = await db
    .select({
      id: briefRedLetterDays.id,
      personName: briefRedLetterDays.personName,
      headline: briefRedLetterDays.headline,
      timing: briefRedLetterDays.timing,
    })
    .from(briefRedLetterDays);

  return rows;
}
