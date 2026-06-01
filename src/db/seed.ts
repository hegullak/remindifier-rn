import { count, eq } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import {
  briefRedLetterDays,
  briefSchedule,
  gatheringParticipants,
  gatherings,
  personEntries,
  personRedLetterDays,
  persons,
  relationships,
  users,
} from "@/db/schema";

async function hasSeedData(userId: string) {
  const db = await getDrizzleDbForUser(userId);
  const [{ value }] = await db
    .select({ value: count() })
    .from(persons)
    .where(eq(persons.userId, userId));
  return value > 0;
}

/** Keeps demo merkedager in sync for existing dev installs (idempotent). */
export async function patchDevMilestoneSeed(userId: string) {
  if (!__DEV__) return;
  const db = await getDrizzleDbForUser(userId);

  await db
    .update(persons)
    .set({ birthdayYearKnown: true })
    .where(eq(persons.id, "p-trond"));

  await db
    .insert(personRedLetterDays)
    .values({
      id: "r-ann-jonas-kari",
      userId,
      personId: "p-jonas",
      kind: "Anniversary",
      label: "Jonas og Kari",
      eventDate: "2006-06-04",
      yearKnown: true,
    })
    .onConflictDoNothing();
}

/**
 * Ensures the demo gathering "Dinner at Ida's" (g-1) exists and is scheduled for
 * today 19:00 — so the demo schedule row "Middag hos Ida" always links to a real
 * event even if it was deleted during testing. Idempotent; dev only.
 */
export async function ensureDemoGathering(userId: string) {
  if (!__DEV__) return;
  const db = await getDrizzleDbForUser(userId);

  const todayAt19 = new Date();
  todayAt19.setHours(19, 0, 0, 0);

  await db
    .insert(gatherings)
    .values({
      id: "g-1",
      userId,
      title: "Dinner at Ida's",
      scheduledAt: todayAt19,
      location: "St. Hanshaugen",
      description: JSON.stringify({
        talkingPoints: [
          { id: "tp-1", kind: "topic", text: "Ask about the Copenhagen apartment offer", done: false },
          { id: "tp-2", kind: "topic", text: "Bring flowers", done: false },
        ],
      }),
      type: "dinner",
    })
    .onConflictDoUpdate({
      target: gatherings.id,
      set: { scheduledAt: todayAt19, title: "Dinner at Ida's" },
    });

  await db
    .insert(gatheringParticipants)
    .values([
      { id: "gp-1", gatheringId: "g-1", personId: "p-ida", userId },
      { id: "gp-2", gatheringId: "g-1", personId: "p-eirik", userId },
      { id: "gp-3", gatheringId: "g-1", personId: "p-anna", userId },
    ])
    .onConflictDoNothing();
}

export async function seedLocalData(userId: string) {
  if (await hasSeedData(userId)) return;
  const db = await getDrizzleDbForUser(userId);

  // Calculate relative dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().slice(0, 10);
  const in6Days = new Date(today);
  in6Days.setDate(today.getDate() + 6);
  const in6DaysStr = in6Days.toISOString().slice(0, 10);

  await db
    .insert(users)
    .values({
      id: userId,
      email: `${userId}@local.remindifier`,
      displayName: "Helga",
    })
    .onConflictDoNothing();

  await db.insert(persons).values([
    {
      id: "p-ida",
      userId,
      displayName: "Ida Nilsen",
      relationType: "Close friend",
      birthday: "1992-06-14",
      interests: [
        "Ran her 6th half marathon in May this year.",
        "Planning a move to Copenhagen in autumn.",
      ],
    },
    {
      id: "p-trond",
      userId,
      displayName: "Trond Hansen",
      relationType: "Uncle / Aunt",
      birthday: "1956-05-27",
      birthdayYearKnown: true,
      interests: ["Still makes sourdough every Sunday morning."],
    },
    {
      id: "p-mari",
      userId,
      displayName: "Mari Solberg",
      relationType: "Sibling",
      birthday: "1989-02-03",
      interests: ["Started ceramics classes and loves it."],
    },
    {
      id: "p-eirik",
      userId,
      displayName: "Eirik Lunde",
      relationType: "Friend",
      birthday: "1990-11-21",
      interests: ["Interviewing for a team lead role this month."],
    },
    {
      id: "p-anna",
      userId,
      displayName: "Anna Berg",
      relationType: "Colleague",
      birthday: "1987-09-12",
      interests: ["Daughter started school this spring."],
    },
    {
      id: "p-jonas",
      userId,
      displayName: "Jonas Vik",
      relationType: "Mentor",
      birthday: "1978-01-18",
      interests: ["Collects old jazz vinyl and rare pressings."],
    },
    {
      id: "p-elin",
      userId,
      displayName: "Elin Dahl",
      relationType: "Cousin",
      birthday: "1995-03-09",
      interests: ["Training for her first triathlon."],
    },
    {
      id: "p-farid",
      userId,
      displayName: "Farid Rahimi",
      relationType: "Acquaintance",
      birthday: "1984-07-05",
      interests: ["Opened a tiny coffee kiosk near the harbor."],
    },
  ]);

  await db.insert(personRedLetterDays).values([
    {
      id: "r-bday-eirik",
      userId,
      personId: "p-eirik",
      kind: "Birthday",
      label: null,
      eventDate: in3DaysStr, // Eirik's birthday in 3 days
      yearKnown: true,
      recurring: true,
    },
    {
      id: "r-ann-jonas-kari",
      userId,
      personId: "p-jonas",
      kind: "Anniversary",
      label: "Jonas og Kari",
      eventDate: in6DaysStr, // Anniversary in 6 days
      yearKnown: true,
      recurring: true,
    },
  ]);

  await db.insert(personEntries).values([
    {
      id: "n-ida-1",
      userId,
      personId: "p-ida",
      entryType: "context",
      body: "She was nervous before the race but finished strong and smiled the whole evening.",
      occurredAt: new Date("2026-05-17T18:30:00Z"),
    },
    {
      id: "n-ida-2",
      userId,
      personId: "p-ida",
      entryType: "follow_up",
      body: "Ask whether she accepted the Copenhagen apartment offer.",
      occurredAt: new Date("2026-05-26T08:45:00Z"),
    },
    {
      id: "n-eirik-1",
      userId,
      personId: "p-eirik",
      entryType: "follow_up",
      body: "Check how the team lead interview went.",
      occurredAt: new Date("2026-05-24T10:00:00Z"),
    },
    {
      id: "n-trond-1",
      userId,
      personId: "p-trond",
      entryType: "context",
      body: "He mentioned his shoulder hurts when gardening, avoid pushing that topic unless he brings it up.",
      occurredAt: new Date("2026-05-20T14:10:00Z"),
    },
    {
      id: "n-anna-1",
      userId,
      personId: "p-anna",
      entryType: "follow_up",
      body: "Send luck message before her product launch next Tuesday.",
      occurredAt: new Date("2026-05-27T07:20:00Z"),
    },
  ]);

  await db.insert(relationships).values([
    {
      id: "rel-1",
      userId,
      fromPersonId: "p-ida",
      toPersonId: "p-eirik",
      label: "friends",
      notes: "They train intervals together on Thursdays.",
    },
    {
      id: "rel-2",
      userId,
      fromPersonId: "p-mari",
      toPersonId: "p-elin",
      label: "cousins",
      notes: "Often coordinate family birthdays.",
    },
    {
      id: "rel-3",
      userId,
      fromPersonId: "p-anna",
      toPersonId: "p-jonas",
      label: "colleagues",
      notes: "Worked on the Q2 launch together.",
    },
  ]);

  await db.insert(gatherings).values({
    id: "g-1",
    userId,
    title: "Dinner at Ida's",
    scheduledAt: new Date(today.getTime() + 2 * 86400000 + 19 * 3600000), // 2 days from now, 19:00
    location: "St. Hanshaugen",
    description: JSON.stringify({
      talkingPoints: [
        {
          id: "tp-1",
          kind: "topic",
          text: "Ask about the Copenhagen apartment offer",
          done: false,
        },
        {
          id: "tp-2",
          kind: "topic",
          text: "Bring flowers",
          done: false,
        },
      ],
    }),
    type: "dinner",
  });

  await db.insert(gatheringParticipants).values([
    { id: "gp-1", gatheringId: "g-1", personId: "p-ida", userId },
    { id: "gp-2", gatheringId: "g-1", personId: "p-eirik", userId },
    { id: "gp-3", gatheringId: "g-1", personId: "p-anna", userId },
  ]);

  await db.insert(briefSchedule).values({
    id: "s1",
    timeLabel: "19:00",
    title: "Dinner at Ida's",
    note: "Bring flowers and ask about her new role.",
  });
  await db.insert(briefRedLetterDays).values([
    {
      id: "r1",
      personName: "Uncle Trond",
      headline: "Birthday · 70 years",
      timing: "Today",
    },
    {
      id: "r2",
      personName: "You",
      headline: "Smoke-free · 4 years",
      timing: "Today · since 27 May 2022",
    },
  ]);
}
