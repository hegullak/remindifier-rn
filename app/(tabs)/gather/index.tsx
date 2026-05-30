import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { triggerLight, triggerMedium } from "@/lib/haptics";
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
  return iso.toLocaleDateString(dateLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function GatherListScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<GatheringListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        <Text className="text-[30px] leading-[36px] text-text1 font-heading pt-1">
          {t("gathering.title")}
        </Text>
        <Text className="text-[14px] text-text2 font-body mt-1 mb-4">{t("gathering.subtitle")}</Text>

        {loading ? (
          <ActivityIndicator color="#C4784A" />
        ) : items.length === 0 ? (
          <View className="mt-8">
            <Text className="text-[14px] text-text2 font-body">{t("gathering.noEvents")}</Text>
            <Text className="text-[13px] text-text3 font-body mt-2">{t("gathering.createFirst")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {items.map((item) => {
              const count = getGatheringTalkingPointCount(item.description);
              const dateLabel = formatDate(item.scheduledAt, locale);
              return (
                <View key={item.id} style={{ marginBottom: 8 }}>
                  <Card>
                    <View className="flex-row items-start gap-3">
                      <Link href={`/gather/${item.id}`} asChild className="flex-1">
                        <Pressable className="flex-1">
                          <Text className="text-[15px] text-text1 font-bodyMedium">
                            {localizeGatheringTitle(item.id, item.title, locale)}
                          </Text>
                          {item.participants.length > 0 ? (
                            <Text className="text-[12px] text-text3 font-body mt-1">
                              {item.participants.join(", ")}
                            </Text>
                          ) : null}
                          <Text className="text-[11px] text-text3 font-body mt-1">
                            {t("gathering.talkingPointCount", { count })}
                          </Text>
                          {dateLabel ? (
                            <Text className="text-[11px] text-text3 font-body mt-0.5">{dateLabel}</Text>
                          ) : null}
                        </Pressable>
                      </Link>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          triggerLight();
                          setDeleteId(item.id);
                        }}
                        hitSlop={8}
                      >
                        <Text className="text-[18px] text-red font-body">✕</Text>
                      </Pressable>
                    </View>
                  </Card>
                </View>
              );
            })}
          </ScrollView>
        )}

        <Pressable
          onPress={() => {
            triggerLight();
            Keyboard.dismiss();
            router.push("/gather/new");
          }}
          accessibilityRole="button"
          accessibilityLabel={t("gathering.createButton")}
          className="absolute right-5 bottom-8 w-14 h-14 rounded-full bg-accent items-center justify-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <Text className="text-[24px] text-card font-body leading-[24px]">+</Text>
        </Pressable>
      </View>

      <BottomSheet
        visible={deleteId !== null}
        onDismiss={() => setDeleteId(null)}
        title={t("gathering.deleteEvent")}
      >
        <Text className="text-[14px] text-text2 font-body mb-4">{t("gathering.deleteEventBody")}</Text>
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
