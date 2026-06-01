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
import { InputActionButtons } from "@/ui/InputActionButtons";

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

type Props = {
  initial?: RedLetterDayInput;
  /** Kinds already saved on this person (excl. Birthday). */
  usedKinds: RedLetterKind[];
  onConfirm: (day: RedLetterDayInput) => void;
  onDismiss: () => void;
  onDelete?: () => void;
};

export function MerkedagComposer({ initial, usedKinds, onConfirm, onDismiss, onDelete }: Props) {
  const { t, locale } = useTranslation();
  const { isDark } = useAppTheme();
  const [kind, setKind] = useState<RedLetterKind>(() => {
    if (initial?.kind && initial.kind !== "Birthday") return initial.kind;
    const available = RED_LETTER_OTHER_KINDS.find((k) => !usedKinds.includes(k));
    return available ?? "Anniversary";
  });
  const [label, setLabel] = useState(initial?.label ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? `${CURRENT_YEAR}-01-01`);
  const [showPicker, setShowPicker] = useState(false);

  const selectableKinds = RED_LETTER_OTHER_KINDS.filter(
    (k) => k === kind || !usedKinds.includes(k),
  );

  const handleConfirm = () => {
    onConfirm({
      id: initial?.id,
      kind,
      label: kind === "Other" ? label.trim() || null : null,
      eventDate,
      yearKnown: true,
      recurring: true,
    });
  };

  return (
    <View className="flex-row items-start gap-2">
      <View className="flex-1 gap-3">
        <View className="flex-row gap-5">
          {selectableKinds.map((k) => {
            const selected = kind === k;
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

        {kind === "Other" ? (
          <TextInput
            value={label}
            onChangeText={setLabel}
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
          <Text className="text-sm text-text1 font-body">{formatLabel(eventDate, locale)}</Text>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={parseIso(eventDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant={isDark ? "dark" : "light"}
            onChange={(event, date) => {
              if (Platform.OS === "android") setShowPicker(false);
              if (event.type === "dismissed" || !date) return;
              setEventDate(toIso(date));
            }}
          />
        ) : null}
      </View>

      <InputActionButtons
        onConfirm={handleConfirm}
        onDismiss={onDismiss}
        onDelete={initial?.id ? onDelete : undefined}
      />
    </View>
  );
}
