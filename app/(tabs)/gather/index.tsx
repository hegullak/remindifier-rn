import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import { listGatheringsForUser, getGatheringTalkingPointCount, deleteGathering } from "@/db/repos/gatheringsRepo";
import type { GatheringListItem } from "@/db/repos/gatheringsRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";
import { useTranslation } from "@/i18n";
import type { Locale } from "@/i18n/types";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";

function formatDate(iso: Date | null, locale: Locale) {
  if (!iso) return null;
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const datePart = iso.toLocaleDateString(dateLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timePart = iso.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export default function GatherListScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const { created } = useLocalSearchParams<{ created?: string }>();
  const [items, setItems] = useState<GatheringListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState(created === "1");

  useEffect(() => {
    if (created !== "1") return;
    setShowCreatedBanner(true);
    const timer = setTimeout(() => setShowCreatedBanner(false), 3000);
    return () => clearTimeout(timer);
  }, [created]);

  async function handleDelete() {
    if (!userId || !deleteId) return;
    setDeleting(true);
    try {
      await deleteGathering(userId, deleteId);
      triggerMedium();
      setDeleteId(null);
      await reload();
    } catch (err) {
      console.error("Delete gathering failed:", err);
    } finally {
      setDeleting(false);
    }
  }

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listGatheringsForUser(userId);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        Keyboard.dismiss();
      };
    }, [reload]),
  );

  return (
    <AppShell>
      <View className="flex-1 px-4 relative">
        <Text className="text-3xl leading-[36px] text-text1 font-heading pt-1">
          {t("gathering.title")}
        </Text>
        <Text className="text-sm text-text2 font-body mt-1 mb-4">{t("gathering.subtitle")}</Text>

        {showCreatedBanner ? (
          <View className="mb-3 flex-row items-center rounded-lg border border-border bg-bg2 px-3 py-2">
            <Text className="text-sm text-sage font-bodySemi">✓ {t("gathering.createdTitle")}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#C4784A" />
        ) : items.length === 0 ? (
          <View className="mt-8">
            <Text className="text-sm text-text2 font-body">{t("gathering.noEvents")}</Text>
            <Text className="text-body text-text3 font-body mt-2">{t("gathering.createFirst")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            {items.map((item) => {
              const count = getGatheringTalkingPointCount(item.description);
              const dateLabel = formatDate(item.scheduledAt, locale);
              return (
                <View key={item.id} style={{ borderRadius: 20, overflow: "hidden", marginBottom: 8 }}>
                <Swipeable
                  friction={1.5}
                  overshootRight={false}
                  rightThreshold={40}
                  renderRightActions={() => (
                    <View className="flex-row">
                      <Pressable
                        onPress={() => { triggerSelection(); router.push(`/gather/${item.id}`); }}
                        className="bg-amber items-center justify-center px-5"
                      >
                        <Text className="text-xl" style={{ color: "#fff" }}>✎</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { triggerLight(); setDeleteId(item.id); }}
                        className="bg-red items-center justify-center px-5"
                      >
                        <Text className="text-xl" style={{ color: "#fff" }}>🗑</Text>
                      </Pressable>
                    </View>
                  )}
                >
                  <View>
                    <Card style={{ marginBottom: 0 }}>
                      <Link href={`/gather/${item.id}`} asChild>
                        <Pressable>
                          <Text className="text-xl text-text1 font-bodyMedium">
                            {localizeGatheringTitle(item.id, item.title, locale)}
                          </Text>
                          {item.participants.length > 0 ? (
                            <Text className="text-sm text-text3 font-body mt-1">
                              {item.participants.join(", ")}
                            </Text>
                          ) : null}
                          {dateLabel ? (
                            <Text className="text-sm text-text2 font-bodyMedium mt-1">{dateLabel}</Text>
                          ) : null}
                          <Text className="text-2xs text-text3 font-body mt-1">
                            {t("gathering.talkingPointCount", { count })}
                          </Text>
                        </Pressable>
                      </Link>
                    </Card>
                  </View>
                </Swipeable>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      <BottomSheet
        visible={deleteId !== null}
        onDismiss={() => setDeleteId(null)}
        title={t("gathering.deleteEvent")}
      >
        <Text className="text-sm text-text2 font-body mb-4">{t("gathering.deleteEventBody")}</Text>
        <View className="gap-2">
          <Button variant="primary" onPress={() => void handleDelete()} loading={deleting} disabled={deleting}>
            {t("common.delete")}
          </Button>
          <Button variant="ghost" onPress={() => setDeleteId(null)} disabled={deleting}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>
    </AppShell>
  );
}
