import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";
import { redLetterKindIcon, redLetterKindLabel } from "@/i18n/redLetterKinds";
import {
  RED_LETTER_OTHER_KINDS,
  type RedLetterDayInput,
  type RedLetterKind,
} from "@/lib/red-letter-day";
import { useAppTheme } from "@/theme/ThemeProvider";

const CURRENT_YEAR = new Date().getFullYear();

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(CURRENT_YEAR, 0, 1);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLabel(iso: string, locale: "en" | "no"): string {
  const date = parseIso(iso);
  return date.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RedLetterDaysSection({
  items,
  onChange,
}: {
  items: RedLetterDayInput[];
  onChange: (next: RedLetterDayInput[]) => void;
}) {
  const { t, locale } = useTranslation();
  const { isDark } = useAppTheme();
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const addDay = () => {
    onChange([
      ...items,
      {
        kind: "Anniversary",
        label: null,
        eventDate: `${CURRENT_YEAR}-01-01`,
        yearKnown: true,
        recurring: true,
      },
    ]);
  };

  const updateDay = (index: number, patch: Partial<RedLetterDayInput>) => {
    onChange(items.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDay = (index: number) => {
    if (pickerIndex === index) setPickerIndex(null);
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <View className="gap-3">
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi">
        {t("redLetter.title")}
      </Text>
      {items.map((day, i) => (
        <View
          key={day.id ?? `new-${i}`}
          className="bg-bg2 border border-border rounded-lg px-4 py-3"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm text-text2 font-bodyMedium">
              {redLetterKindIcon(day.kind)} {redLetterKindLabel(day.kind, locale)}
              {day.kind === "Other" && day.label ? ` · ${day.label}` : ""}
            </Text>
            <Pressable onPress={() => removeDay(i)} hitSlop={8}>
              <Text className="text-xs text-red font-bodyMedium">{t("redLetter.remove")}</Text>
            </Pressable>
          </View>

          {/* Kind — icon only */}
          <View className="flex-row gap-4 mb-3">
            {RED_LETTER_OTHER_KINDS.map((kind) => {
              const selected = day.kind === kind;
              return (
                <Pressable
                  key={kind}
                  onPress={() => updateDay(i, { kind: kind as RedLetterKind })}
                  hitSlop={8}
                  className="items-center active:opacity-60"
                  accessibilityLabel={redLetterKindLabel(kind, locale)}
                >
                  <Text style={{ fontSize: 24, opacity: selected ? 1 : 0.3 }}>
                    {redLetterKindIcon(kind)}
                  </Text>
                  <View className={`w-1 h-1 rounded-full mt-1 ${selected ? "bg-accent" : ""}`} />
                </Pressable>
              );
            })}
          </View>

          {day.kind === "Other" ? (
            <TextInput
              value={day.label ?? ""}
              onChangeText={(label) => updateDay(i, { label: label || null })}
              placeholder={t("redLetter.customLabel")}
              placeholderTextColor="#7A8CAD"
              className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-text1 font-body mb-3"
            />
          ) : null}

          <Pressable
            onPress={() => setPickerIndex(pickerIndex === i ? null : i)}
            className="bg-card border border-border rounded-md px-3 py-2.5"
            accessibilityRole="button"
          >
            <Text className="text-sm text-text1 font-body">{formatLabel(day.eventDate, locale)}</Text>
          </Pressable>
          {pickerIndex === i ? (
            <DateTimePicker
              value={parseIso(day.eventDate)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              themeVariant={isDark ? "dark" : "light"}
              onChange={(event, date) => {
                if (Platform.OS === "android") setPickerIndex(null);
                if (event.type === "dismissed" || !date) return;
                updateDay(i, { eventDate: toIso(date) });
              }}
            />
          ) : null}
        </View>
      ))}

      <Pressable onPress={addDay} className="self-start">
        <Text className="text-sm text-accent font-bodyMedium">{t("redLetter.add")}</Text>
      </Pressable>
    </View>
  );
}
