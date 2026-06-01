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
import { triggerLight } from "@/lib/haptics";

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

function MerkedagRow({
  day,
  usedKinds,
  onChange,
  onRemove,
}: {
  day: RedLetterDayInput;
  usedKinds: RedLetterKind[];
  onChange: (next: RedLetterDayInput) => void;
  onRemove: () => void;
}) {
  const { t, locale } = useTranslation();
  const { isDark } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);

  const selectableKinds = RED_LETTER_OTHER_KINDS.filter(
    (k) => k === day.kind || !usedKinds.includes(k),
  );

  const setKind = (kind: RedLetterKind) => {
    if (usedKinds.includes(kind)) return;
    onChange({ ...day, kind, label: kind === "Other" ? day.label : null });
  };

  return (
    <View className="flex-row items-start gap-2 mb-4">
      <View className="flex-1 gap-3">
        <View className="flex-row gap-5">
          {selectableKinds.map((k) => {
            const selected = day.kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                hitSlop={8}
                className="items-center active:opacity-60"
                accessibilityLabel={redLetterKindLabel(k, locale)}
              >
                <Text style={{ fontSize: 28, opacity: selected ? 1 : 0.35 }}>
                  {redLetterKindIcon(k)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {day.kind === "Other" ? (
          <TextInput
            value={day.label ?? ""}
            onChangeText={(label) => onChange({ ...day, label: label || null })}
            placeholder={t("redLetter.customLabel")}
            placeholderTextColor="#7A8CAD"
            className="bg-bg2 border border-border rounded-md px-3 py-2.5 text-sm text-text1 font-body"
          />
        ) : null}

        <Pressable
          onPress={() => setShowPicker((v) => !v)}
          className="active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-sm text-text1 font-body">{formatLabel(day.eventDate, locale)}</Text>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={parseIso(day.eventDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant={isDark ? "dark" : "light"}
            onChange={(event, date) => {
              if (Platform.OS === "android") setShowPicker(false);
              if (event.type === "dismissed" || !date) return;
              onChange({ ...day, eventDate: toIso(date) });
            }}
          />
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          triggerLight();
          onRemove();
        }}
        hitSlop={8}
        className="w-10 h-10 items-center justify-center active:opacity-70"
        accessibilityLabel="Delete"
      >
        <Text className="text-lg">🗑</Text>
      </Pressable>
    </View>
  );
}

export function RedLetterDaysSection({
  items,
  onChange,
  showSectionTitle = true,
}: {
  items: RedLetterDayInput[];
  onChange: (next: RedLetterDayInput[]) => void;
  showSectionTitle?: boolean;
}) {
  const { t } = useTranslation();

  const addDay = () => {
    const usedKinds = items.map((d) => d.kind);
    const nextKind = RED_LETTER_OTHER_KINDS.find((k) => !usedKinds.includes(k));
    if (!nextKind) return;
    onChange([
      ...items,
      {
        kind: nextKind,
        label: null,
        eventDate: `${CURRENT_YEAR}-01-01`,
        yearKnown: true,
        recurring: true,
      },
    ]);
  };

  const updateDay = (index: number, patch: Partial<RedLetterDayInput>) => {
    if (patch.kind && items.some((d, j) => j !== index && d.kind === patch.kind)) {
      return;
    }
    onChange(items.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDay = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const allKindsUsed = items.length >= RED_LETTER_OTHER_KINDS.length;

  return (
    <View className="gap-1">
      {showSectionTitle ? (
        <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mb-2">
          {t("redLetter.title")}
        </Text>
      ) : null}
      {items.map((day, i) => (
        <MerkedagRow
          key={day.id ?? `${day.kind}-${i}`}
          day={day}
          usedKinds={items.filter((_, j) => j !== i).map((d) => d.kind)}
          onChange={(next) => updateDay(i, next)}
          onRemove={() => removeDay(i)}
        />
      ))}

      {!allKindsUsed ? (
        <Pressable onPress={addDay} className="self-start py-1">
          <Text className="text-sm text-accent font-bodyMedium">{t("redLetter.add")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
