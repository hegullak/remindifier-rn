import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { deleteAllData, exportAllData } from "@/db/repos/settingsRepo";
import { resetOnboarding } from "@/db/repos/userRepo";
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
    <AppShell showProfileLink={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} className="pt-1 pb-2 self-start">
          <Text className="text-[12px] text-accent font-bodyMedium">{t("common.back")}</Text>
        </Pressable>
        <Text className="text-[30px] leading-[36px] text-text1 font-heading mb-4">
          {t("settings.title")}
        </Text>

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
              <Button variant="secondary" onPress={() => void seedDevCalendar()}>
                Refresh seed calendar
              </Button>
              <Button variant="secondary" onPress={() => void deleteSeedCalendar()}>
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
