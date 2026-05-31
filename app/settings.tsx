import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { deleteAllData, exportAllData } from "@/db/repos/settingsRepo";
import { resetOnboarding, setBriefSectionOrder } from "@/db/repos/userRepo";
import { DEFAULT_BRIEF_SECTION_ORDER } from "@/lib/brief/sections";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import { deleteSeedCalendar, seedDevCalendar } from "@/db/seedCalendar";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";
import { AccountSettingsSection } from "@/features/auth/AccountSettingsSection";
import { clearClerkAuthStorage } from "@/features/auth/clerk/clearAuthStorage";
import { DEV_BYPASS_AUTH } from "@/features/auth/devBypass";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { useTranslation } from "@/i18n";
import { getLastErrorTimestamp } from "@/lib/logUtils";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { SettingsAccordion } from "@/ui/SettingsAccordion";

const PRIVACY_KEYS = ["privacy.p1", "privacy.p2", "privacy.p3"] as const;

export default function SettingsScreen() {
  const { t, locale } = useTranslation();
  const { userId, signOut } = useAppAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const { db, loading: dbLoading } = useUserDrizzleDb(userId);
  const [exporting, setExporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const appVersion = Constants.expoConfig?.version ?? "—";
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";

  useEffect(() => {
    getLastErrorTimestamp().then(setLastError);
  }, []);

  async function handleExport() {
    if (!db) {
      Alert.alert(t("alerts.exportTitle"), t("data.exportNotReady"));
      return;
    }
    setExporting(true);
    try {
      const payload = await exportAllData(db);
      const json = JSON.stringify(payload, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      const filePath = `${FileSystem.cacheDirectory}remindifier-export-${date}.json`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t("alerts.exportTitle"), t("data.exportSaved", { path: filePath }));
        return;
      }
      await Sharing.shareAsync(filePath, {
        mimeType: "application/json",
        UTI: "public.json",
      });
    } catch (err: unknown) {
      Alert.alert(
        t("alerts.exportTitle"),
        err instanceof Error ? err.message : t("data.exportFailed"),
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleResetOnboarding() {
    if (!userId) return;
    await resetOnboarding(userId);
    router.replace("/onboarding");
  }

  async function handleResetSectionOrder() {
    if (!userId) return;
    await setBriefSectionOrder(userId, DEFAULT_BRIEF_SECTION_ORDER);
    notifyBriefReload();
    Alert.alert("Brief", "Seksjons-rekkefølge er tilbakestilt.");
  }

  async function handleDeleteAll() {
    if (!db) return;
    setDeletingAll(true);
    try {
      await deleteAllData(db);
      setShowDeleteSheet(false);
      try {
        await signOut();
      } catch {
        // Session may already be cleared.
      }
      await clearClerkAuthStorage();
      router.replace("/");
    } catch (err: unknown) {
      Alert.alert(
        t("alerts.deleteTitle"),
        err instanceof Error ? err.message : t("data.deleteFailed"),
      );
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <AppShell
      showProfileLink={false}
      headerLeft={
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Text className="text-[20px] text-accent font-body">←</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Text className="text-[30px] leading-[36px] text-text1 font-heading mb-4 mt-1">
          {t("settings.title")}
        </Text>

        <Card style={{ marginBottom: 8 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] text-text1 font-bodyMedium">
              {isDark ? "Mørk modus" : "Lys modus"}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#A89E90", true: "#7EB8D4" }}
              thumbColor={isDark ? "#EEF0F5" : "#F7F4EF"}
            />
          </View>
        </Card>

        {dbLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color="#C4784A" /> : null}

        <AccountSettingsSection />

        <SettingsAccordion title={t("privacy.title")}>
          {PRIVACY_KEYS.map((key, index) => (
            <Text
              key={key}
              className={`text-[14px] text-text2 font-body leading-[21px] ${index > 0 ? "mt-2" : ""}`}
            >
              {t(key)}
            </Text>
          ))}
        </SettingsAccordion>

        <SettingsAccordion title={t("data.title")}>
          {lastError ? (
            <Text className="text-[12px] text-text3 font-body mb-3">
              {t("data.lastError", {
                date: new Date(lastError).toLocaleString(dateLocale),
              })}
            </Text>
          ) : null}
          <View className="gap-3">
            <Button
              variant="secondary"
              onPress={handleExport}
              loading={exporting}
              disabled={exporting || dbLoading}
            >
              {t("data.exportAll")}
            </Button>
            <Button variant="secondary" onPress={() => setShowDeleteSheet(true)}>
              {t("data.deleteAll")}
            </Button>
          </View>
        </SettingsAccordion>

        {__DEV__ ? (
          <Card style={{ marginTop: 8 }}>
            <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mb-3">
              DEV {DEV_BYPASS_AUTH ? "· bypass active" : ""}
            </Text>
            <View className="gap-2">
              <Button variant="secondary" onPress={() => void handleResetOnboarding()}>
                Reset onboarding
              </Button>
              <Button variant="secondary" onPress={() => void handleResetSectionOrder()}>
                Reset brief section order
              </Button>
              <Button
                variant="secondary"
                onPress={async () => {
                  const result = await seedDevCalendar();
                  if (result.ok) {
                    notifyBriefReload();
                    Alert.alert(
                      "Seed calendar",
                      `Removed ${result.removed} events, created ${result.created}.`,
                    );
                  } else if (result.reason === "no_permission") {
                    Alert.alert("Seed calendar", "Calendar permission not granted.");
                  } else {
                    Alert.alert(
                      "Seed calendar",
                      result.message ?? `Failed (${result.reason}).`,
                    );
                  }
                }}
              >
                Refresh seed calendar
              </Button>
              <Button
                variant="secondary"
                onPress={async () => {
                  await deleteSeedCalendar();
                  notifyBriefReload();
                  Alert.alert("Seed calendar", "Deleted remindifier (test) calendar.");
                }}
              >
                Delete seed calendar
              </Button>
            </View>
          </Card>
        ) : null}

        <Card style={{ marginTop: 8 }}>
          <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
            {t("about.title")}
          </Text>
          <Text className="text-[14px] text-text2 font-body mt-2">
            {t("about.version", { version: appVersion })}
          </Text>
          <Text className="text-[12px] text-text3 font-body mt-3 leading-[18px]">
            {t("about.disclaimer")}
          </Text>
        </Card>
      </ScrollView>

      <BottomSheet
        visible={showDeleteSheet}
        onDismiss={() => setShowDeleteSheet(false)}
        title={t("data.deleteSheetTitle")}
      >
        <Text className="text-[14px] text-text2 font-body mb-4 leading-[21px]">
          {t("data.deleteSheetBody")}
        </Text>
        <View className="gap-2">
          <Pressable
            onPress={handleDeleteAll}
            disabled={deletingAll}
            className="bg-red rounded-lg py-3 items-center opacity-100 disabled:opacity-60"
          >
            {deletingAll ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-[14px] text-white font-bodySemi">
                {t("data.deleteConfirm")}
              </Text>
            )}
          </Pressable>
          <Button variant="ghost" onPress={() => setShowDeleteSheet(false)} disabled={deletingAll}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>
    </AppShell>
  );
}
