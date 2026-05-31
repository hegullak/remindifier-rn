import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";
import { redLetterKindLabel } from "@/i18n/redLetterKinds";
import {
  RED_LETTER_OTHER_KINDS,
  type RedLetterDayInput,
  type RedLetterKind,
} from "@/lib/red-letter-day";

const CURRENT_YEAR = new Date().getFullYear();

function dateInputValue(eventDate: string, yearKnown: boolean): string {
  if (!eventDate) return "";
  if (yearKnown) return eventDate;
  const m = /^\d{4}-(\d{2}-\d{2})$/.exec(eventDate);
  return m ? `2000-${m[1]}` : eventDate;
}

export function RedLetterDaysSection({
  items,
  onChange,
}: {
  items: RedLetterDayInput[];
  onChange: (next: RedLetterDayInput[]) => void;
}) {
  const { t, locale } = useTranslation();

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
            <Text className="text-xs text-text3 font-bodySemi">
              {redLetterKindLabel(day.kind, locale)}
              {day.kind === "Other" && day.label ? ` · ${day.label}` : ""}
            </Text>
            <Pressable onPress={() => removeDay(i)}>
              <Text className="text-xs text-red font-bodyMedium">{t("redLetter.remove")}</Text>
            </Pressable>
          </View>

          <Text className="text-3xs uppercase tracking-[1px] text-text3 font-bodySemi mb-1">
            {t("redLetter.type")}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {RED_LETTER_OTHER_KINDS.map((kind) => (
              <Pressable
                key={kind}
                onPress={() => updateDay(i, { kind: kind as RedLetterKind })}
                className={`rounded-full px-3 py-1.5 border ${
                  day.kind === kind ? "bg-accent border-accent" : "bg-card border-border"
                }`}
              >
                <Text
                  className={`text-xs font-bodyMedium ${
                    day.kind === kind ? "text-card" : "text-text2"
                  }`}
                >
                  {redLetterKindLabel(kind, locale)}
                </Text>
              </Pressable>
            ))}
          </View>

          {day.kind === "Other" ? (
            <>
              <Text className="text-3xs uppercase tracking-[1px] text-text3 font-bodySemi mb-1">
                {t("redLetter.label")}
              </Text>
              <TextInput
                value={day.label ?? ""}
                onChangeText={(label) => updateDay(i, { label: label || null })}
                placeholder={t("redLetter.customLabel")}
                placeholderTextColor="#7A8CAD"
                className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-text1 font-body mb-3"
              />
            </>
          ) : null}

          <Text className="text-3xs uppercase tracking-[1px] text-text3 font-bodySemi mb-1">
            {t("redLetter.dateLabel")}
          </Text>
          <TextInput
            value={dateInputValue(day.eventDate, day.yearKnown)}
            onChangeText={(eventDate) => updateDay(i, { eventDate })}
            placeholder="2020-06-14"
            placeholderTextColor="#7A8CAD"
            autoCapitalize="none"
            className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-text1 font-body"
          />

          <Pressable
            onPress={() => updateDay(i, { yearKnown: !day.yearKnown })}
            className="mt-3 flex-row items-center gap-2"
          >
            <View
              className={`h-5 w-5 rounded border ${
                day.yearKnown ? "bg-accent border-accent" : "border-border bg-card"
              }`}
            />
            <Text className="text-body text-text2 font-body">{t("redLetter.yearKnown")}</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={addDay} className="self-start">
        <Text className="text-sm text-accent font-bodyMedium">{t("redLetter.add")}</Text>
      </Pressable>
    </View>
  );
}
