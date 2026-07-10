import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, Switch, Text, View } from "react-native";
import { getSelectedCalendarIds, setSelectedCalendarIds } from "@/db/repos/userRepo";
import { useTranslation } from "@/i18n";
import type { CalendarAccessStatus } from "@/lib/brief/calendarEvents";
import {
  isCalendarEnabled,
  toggleCalendarId,
  type SavedCalendarSelection,
} from "@/lib/brief/calendarSelection";
import { listDeviceCalendars, type DeviceCalendarSummary } from "@/lib/brief/listDeviceCalendars";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";

type Props = {
  userId: string | null | undefined;
};

export function CalendarSelectionSection({ userId }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [access, setAccess] = useState<CalendarAccessStatus>("denied");
  const [calendars, setCalendars] = useState<DeviceCalendarSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<SavedCalendarSelection>(undefined);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [saved, device] = await Promise.all([
        getSelectedCalendarIds(userId),
        listDeviceCalendars(),
      ]);
      setSelectedIds(saved);
      setCalendars(device.calendars);
      setAccess(device.access);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onToggle(calendarId: string, enabled: boolean) {
    if (!userId) return;
    const allIds = calendars.map((c) => c.id);
    const next = toggleCalendarId(selectedIds, allIds, calendarId, enabled);
    setSelectedIds(next);
    setSaving(true);
    try {
      await setSelectedCalendarIds(userId, next);
      notifyBriefReload();
    } finally {
      setSaving(false);
    }
  }

  const allIds = calendars.map((c) => c.id);

  return (
    <CardWrap>
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mb-1">
        {t("settings.calendar.title")}
      </Text>
      <Text className="text-sm text-text2 font-body leading-[20px] mb-3">
        {t("settings.calendar.readOnlyNote")}
      </Text>

      {loading ? (
        <ActivityIndicator color="#C4784A" />
      ) : access === "expo_go" ? (
        <Text className="text-sm text-text3 font-body">{t("brief.calendarAccess.expoGoBody")}</Text>
      ) : access === "denied" || access === "error" ? (
        <View className="gap-2">
          <Text className="text-sm text-text2 font-body">{t("settings.calendar.permissionNeeded")}</Text>
          <Pressable
            onPress={() => void listDeviceCalendars().then((r) => {
              setAccess(r.access);
              setCalendars(r.calendars);
            })}
            className="self-start active:opacity-70"
          >
            <Text className="text-sm text-accent font-bodySemi">{t("settings.calendar.grantAccess")}</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openSettings()} className="self-start active:opacity-70">
            <Text className="text-sm text-text3 font-body">{t("brief.calendarAccess.openSettings")}</Text>
          </Pressable>
        </View>
      ) : calendars.length === 0 ? (
        <Text className="text-sm text-text3 font-body">{t("settings.calendar.empty")}</Text>
      ) : (
        <View className="gap-1">
          {calendars.map((calendar) => {
            const enabled = isCalendarEnabled(calendar.id, selectedIds, allIds);
            return (
              <View
                key={calendar.id}
                className="flex-row items-center justify-between py-2 border-b border-bg2"
              >
                <View className="flex-row items-center gap-3 flex-1 pr-3">
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: calendar.color || "#7EB8D4" }}
                  />
                  <View className="flex-1">
                    <Text className="text-body-lg text-text1 font-bodyMedium">{calendar.title}</Text>
                    {calendar.sourceName ? (
                      <Text className="text-xs text-text3 font-body">{calendar.sourceName}</Text>
                    ) : null}
                  </View>
                </View>
                <Switch
                  value={enabled}
                  disabled={saving}
                  onValueChange={(value) => void onToggle(calendar.id, value)}
                  trackColor={{ false: "#A89E90", true: "#7EB8D4" }}
                  thumbColor={enabled ? "#EEF0F5" : "#F7F4EF"}
                />
              </View>
            );
          })}
          {selectedIds !== undefined && selectedIds.length === 0 ? (
            <Text className="text-xs text-amber font-body mt-2">{t("settings.calendar.noneSelected")}</Text>
          ) : null}
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
