import { forwardRef, useImperativeHandle, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import type { UpsertPersonInput } from "@/db/repos/peopleRepo";
import { BirthdayField } from "@/features/people/BirthdayField";
import { RedLetterDaysSection } from "@/features/people/RedLetterDaysSection";
import { useTranslation } from "@/i18n/LanguageContext";
import { RELATION_CATEGORIES } from "@/i18n/relationTypes";
import type { RedLetterDayInput } from "@/lib/red-letter-day";
import { Card } from "@/ui/Card";

export interface PersonFormHandle {
  submit: () => void;
  delete: () => void;
  saving: boolean;
}

interface PersonFormProps {
  initial?: {
    displayName: string;
    relationType: string | null;
    birthday: string | null;
    birthdayYearKnown: boolean;
    isSensitive: boolean;
    funFacts: string[];
    redLetterDays: RedLetterDayInput[];
  };
  submitLabel: string;
  onSubmit: (payload: UpsertPersonInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  layout?: "default" | "cards";
  hideActions?: boolean;
  onSavingChange?: (saving: boolean) => void;
}

const fieldClass =
  "mt-2 bg-bg2 border border-border rounded-md px-3 py-3 text-sm text-text1 font-body";

export const PersonForm = forwardRef<PersonFormHandle, PersonFormProps>(function PersonForm(
  {
    initial,
    submitLabel,
    onSubmit,
    onDelete,
    layout = "default",
    hideActions = false,
    onSavingChange,
  },
  ref,
) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [relationType, setRelationType] = useState(initial?.relationType ?? "");
  const [birthday, setBirthday] = useState(initial?.birthday ?? "");
  const [birthdayYearKnown, setBirthdayYearKnown] = useState(initial?.birthdayYearKnown ?? true);
  const [isSensitive, setIsSensitive] = useState(initial?.isSensitive ?? false);
  const [funFactsText, setFunFactsText] = useState((initial?.funFacts ?? []).join("\n"));
  const [redLetterDays, setRedLetterDays] = useState<RedLetterDayInput[]>(
    initial?.redLetterDays ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError(t("common.nameRequired"));
      return;
    }
    setSaving(true);
    onSavingChange?.(true);
    setError(null);
    try {
      const funFacts = funFactsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      await onSubmit({
        displayName,
        relationType: relationType.trim() || null,
        birthday: birthday.trim() || null,
        birthdayYearKnown,
        isSensitive,
        funFacts,
        redLetterDays,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("people.savePersonFailed"));
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    onSavingChange?.(true);
    setError(null);
    try {
      await onDelete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("people.deletePersonFailed"));
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      void handleSubmit();
    },
    delete: () => {
      void handleDelete();
    },
    saving,
  }));

  const nameFields = (
    <>
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi">
        {t("personForm.about")}
      </Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t("personForm.fullName")}
        placeholderTextColor="#7A8CAD"
        className={fieldClass}
      />
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mt-4 mb-2">
        {t("personForm.relationType")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {RELATION_CATEGORIES.map((cat) => {
          const selected = relationType === cat.value;
          return (
            <Pressable
              key={cat.value}
              onPress={() => setRelationType(selected ? "" : cat.value)}
              className={`px-3 py-1.5 rounded-pill border ${
                selected ? "bg-accent border-accent" : "bg-bg2 border-border"
              }`}
            >
              <Text className={`text-xs font-bodyMedium ${selected ? "text-card" : "text-text2"}`}>
                {t(cat.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const merkedagerFields = (
    <>
      {/* Bursdag — egen 🎂-rad (lagres fortsatt i person.birthday) */}
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mb-1">
        🎂 {t("personForm.birthday")}
      </Text>
      <BirthdayField
        birthday={birthday}
        birthdayYearKnown={birthdayYearKnown}
        onBirthdayChange={setBirthday}
        onBirthdayYearKnownChange={setBirthdayYearKnown}
        fieldClass={fieldClass}
      />
      <View className="h-px bg-border my-4" />
      <RedLetterDaysSection items={redLetterDays} onChange={setRedLetterDays} />
    </>
  );

  const extraFields = (
    <>
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi">
        {t("personForm.funFacts")}
      </Text>
      <TextInput
        value={funFactsText}
        onChangeText={setFunFactsText}
        placeholder={t("personForm.funFactsPlaceholder")}
        placeholderTextColor="#7A8CAD"
        multiline
        numberOfLines={5}
        className={fieldClass}
        style={{ textAlignVertical: "top", minHeight: 110 }}
      />
      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-xs text-text2 font-body">{t("personForm.handleWithCare")}</Text>
        <Switch value={isSensitive} onValueChange={setIsSensitive} />
      </View>
    </>
  );

  const actions = hideActions ? null : (
    <>
      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        className="mt-4 bg-accent rounded-lg py-3 px-4 items-center"
      >
        <Text className="text-sm text-card font-bodySemi">
          {saving ? t("personForm.saving") : submitLabel}
        </Text>
      </Pressable>
      {onDelete ? (
        <Pressable
          onPress={handleDelete}
          disabled={saving}
          className="mt-2 border border-red/40 rounded-lg py-3 px-4 items-center"
        >
          <Text className="text-body text-red font-bodyMedium">
            {t("personForm.deletePerson")}
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  const errorBlock = error ? (
    <Text className="text-xs text-red font-body mt-3">{error}</Text>
  ) : null;

  if (layout === "cards") {
    return (
      <View>
        <Card style={{ marginBottom: 12 }}>{nameFields}</Card>
        <Card style={{ marginBottom: 12 }}>{merkedagerFields}</Card>
        <Card style={{ marginBottom: 12 }}>{extraFields}</Card>
        {errorBlock}
        {actions}
      </View>
    );
  }

  return (
    <View className="bg-card border border-border rounded-lg px-4 py-4">
      {nameFields}
      <View className="mt-5">{merkedagerFields}</View>
      <View className="mt-5">{extraFields}</View>
      {errorBlock}
      {actions}
    </View>
  );
});
