import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { listCalendarSyncLinks } from "@/db/repos/calendarSyncRepo";
import { useTranslation } from "@/i18n";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import type { CalendarAccessStatus } from "@/lib/brief/calendarEvents";
import { syncLinkedCalendar, unlinkCalendar } from "@/lib/brief/calendarSync";
import { ECHO_CALENDAR_TITLE } from "@/lib/brief/echoCalendar";
import { type DeviceCalendarSummary, listDeviceCalendars } from "@/lib/brief/listDeviceCalendars";

type Props = {
  userId: string | null | undefined;
};

type LinkedState = Record<string, { lastSyncedAt: Date | null }>;

export function EchoCalendarSection({ userId }: Props) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<CalendarAccessStatus>("denied");
  const [calendars, setCalendars] = useState<DeviceCalendarSummary[]>([]);
  const [linked, setLinked] = useState<LinkedState>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [device, links] = await Promise.all([
        listDeviceCalendars(),
        listCalendarSyncLinks(userId),
      ]);
      setCalendars(device.calendars.filter((c) => c.title !== ECHO_CALENDAR_TITLE));
      setAccess(device.access);
      const nextLinked: LinkedState = {};
      for (const link of links) {
        nextLinked[link.sourceCalendarId] = { lastSyncedAt: link.lastSyncedAt };
      }
      setLinked(nextLinked);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync(calendar: DeviceCalendarSummary) {
    if (!userId) return;
    setSyncingId(calendar.id);
    setErrorId(null);
    try {
      const result = await syncLinkedCalendar(userId, calendar.id, calendar.title);
      if (result.ok) {
        setLinked((prev) => ({ ...prev, [calendar.id]: { lastSyncedAt: new Date() } }));
        notifyBriefReload();
      } else {
        setErrorId(calendar.id);
      }
    } finally {
      setSyncingId(null);
    }
  }

  async function runRemove(calendarId: string) {
    if (!userId) return;
    setSyncingId(calendarId);
    setErrorId(null);
    try {
      await unlinkCalendar(userId, calendarId);
      setLinked((prev) => {
        const next = { ...prev };
        delete next[calendarId];
        return next;
      });
      notifyBriefReload();
    } finally {
      setSyncingId(null);
    }
  }

  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";

  return (
    <CardWrap>
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mb-1">
        {t("settings.echoCalendar.title")}
      </Text>
      <Text className="text-sm text-text2 font-body leading-[20px] mb-3">
        {t("settings.echoCalendar.note")}
      </Text>

      {loading ? (
        <ActivityIndicator color="#C4784A" />
      ) : access === "expo_go" ? (
        <Text className="text-sm text-text3 font-body">{t("brief.calendarAccess.expoGoBody")}</Text>
      ) : access === "denied" || access === "error" ? (
        <View className="gap-2">
          <Text className="text-sm text-text2 font-body">
            {t("settings.echoCalendar.permissionNeeded")}
          </Text>
          <Pressable onPress={() => void load()} className="self-start active:opacity-70">
            <Text className="text-sm text-accent font-bodySemi">
              {t("settings.echoCalendar.grantAccess")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void Linking.openSettings()}
            className="self-start active:opacity-70"
          >
            <Text className="text-sm text-text3 font-body">
              {t("brief.calendarAccess.openSettings")}
            </Text>
          </Pressable>
        </View>
      ) : calendars.length === 0 ? (
        <Text className="text-sm text-text3 font-body">{t("settings.echoCalendar.empty")}</Text>
      ) : (
        <View className="gap-1">
          {calendars.map((calendar) => {
            const link = linked[calendar.id];
            const isSyncing = syncingId === calendar.id;
            const hasError = errorId === calendar.id;
            return (
              <View key={calendar.id} className="py-2 border-b border-bg2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-3">
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: calendar.color || "#7EB8D4" }}
                    />
                    <View className="flex-1">
                      <Text className="text-body-lg text-text1 font-bodyMedium">
                        {calendar.title}
                      </Text>
                      <Text className="text-xs text-text3 font-body">
                        {link
                          ? link.lastSyncedAt
                            ? t("settings.echoCalendar.lastSynced", {
                                time: link.lastSyncedAt.toLocaleString(dateLocale, {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                              })
                            : t("settings.echoCalendar.neverSynced")
                          : calendar.sourceName}
                      </Text>
                    </View>
                  </View>
                  {isSyncing ? (
                    <ActivityIndicator color="#7EB8D4" />
                  ) : link ? (
                    <View className="flex-row gap-3">
                      <Pressable onPress={() => void runSync(calendar)} hitSlop={8}>
                        <Text className="text-sm text-accent font-bodySemi">
                          {t("settings.echoCalendar.syncAgain")}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => void runRemove(calendar.id)} hitSlop={8}>
                        <Text className="text-sm text-red font-bodySemi">
                          {t("settings.echoCalendar.remove")}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => void runSync(calendar)} hitSlop={8}>
                      <Text className="text-sm text-accent font-bodySemi">
                        {t("settings.echoCalendar.copy")}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {hasError ? (
                  <Text className="text-xs text-red font-body mt-1">
                    {t("settings.echoCalendar.syncFailed")}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </CardWrap>
  );
}

function CardWrap({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl bg-card border border-bg2 px-4 py-4 mt-2 mb-2">{children}</View>
  );
}
