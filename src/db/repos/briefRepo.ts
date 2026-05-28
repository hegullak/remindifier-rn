import { asc, eq } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { briefSchedule, personRedLetterDays, persons } from "@/db/schema";
import {
  legacyAnniversaryRow,
  legacyBirthdayRow,
  type RedLetterDayRow,
  type UpcomingRedLetterDay,
  upcomingRedLetterDays,
} from "@/lib/timeline/red-letter-days";

export interface BriefScheduleItem {
  id: string;
  time: string;
  title: string;
  note: string;
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

export async function listAllRedLetterSources(userId: string): Promise<RedLetterDayRow[]> {
  const db = await getDrizzleDbForUser(userId);
  const explicit = await db
    .select({
      id: personRedLetterDays.id,
      personId: personRedLetterDays.personId,
      personName: persons.displayName,
      kind: personRedLetterDays.kind,
      label: personRedLetterDays.label,
      eventDate: personRedLetterDays.eventDate,
      yearKnown: personRedLetterDays.yearKnown,
    })
    .from(personRedLetterDays)
    .innerJoin(persons, eq(personRedLetterDays.personId, persons.id))
    .where(eq(personRedLetterDays.userId, userId));

  const people = await db
    .select({
      id: persons.id,
      displayName: persons.displayName,
      birthday: persons.birthday,
      birthdayYearKnown: persons.birthdayYearKnown,
      anniversary: persons.anniversary,
    })
    .from(persons)
    .where(eq(persons.userId, userId));

  const legacy: RedLetterDayRow[] = [];
  for (const p of people) {
    if (p.birthday) {
      legacy.push(legacyBirthdayRow(p.id, p.displayName, p.birthday, p.birthdayYearKnown));
    }
    if (p.anniversary) {
      legacy.push(legacyAnniversaryRow(p.id, p.displayName, p.anniversary));
    }
  }

  return [...explicit, ...legacy];
}

export async function listUpcomingRedLetterDays(
  userId: string,
  windowDays = 90,
): Promise<UpcomingRedLetterDay[]> {
  const rows = await listAllRedLetterSources(userId);
  return upcomingRedLetterDays(rows, new Date(), windowDays);
}
