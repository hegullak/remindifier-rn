import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { BirthdayField } from "@/features/people/BirthdayField";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  parseRelationTypes,
  RELATION_CATEGORIES,
  serializeRelationTypes,
  toggleRelationCategory,
  translateRelationType,
} from "@/i18n/relationTypes";
import { computeAgeFromBirthday } from "@/lib/birthdayForm";
import { triggerMedium, triggerSelection } from "@/lib/haptics";

const fieldClass =
  "mt-2 bg-bg2 border border-border rounded-md px-3 py-3 text-sm text-text1 font-body";

export type PersonProfileHeaderHandle = {
  startEdit: () => void;
};

type Props = {
  displayName: string;
  relationType: string | null;
  birthday: string | null;
  birthdayYearKnown: boolean;
  monogram: ReactNode;
  onSave: (fields: {
    displayName: string;
    relationType: string | null;
    birthday: string | null;
    birthdayYearKnown: boolean;
  }) => Promise<void>;
};

export const PersonProfileHeader = forwardRef<PersonProfileHeaderHandle, Props>(
  function PersonProfileHeader(
    { displayName, relationType, birthday, birthdayYearKnown, monogram, onSave },
    ref,
  ) {
  const { t, locale } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(displayName);
  const [draftRelations, setDraftRelations] = useState<string[]>(() =>
    parseRelationTypes(relationType),
  );
  const [draftBirthday, setDraftBirthday] = useState(birthday ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraftName(displayName);
      setDraftRelations(parseRelationTypes(relationType));
      setDraftBirthday(birthday ?? "");
    }
  }, [displayName, relationType, birthday, editing]);

  const relationLabel = translateRelationType(relationType, locale);
  const age = computeAgeFromBirthday(birthday, birthdayYearKnown);

  const startEdit = () => {
    setDraftName(displayName);
    setDraftRelations(parseRelationTypes(relationType));
    setDraftBirthday(birthday ?? "");
    setEditing(true);
  };

  useImperativeHandle(ref, () => ({ startEdit }));

  const cancelEdit = () => {
    setEditing(false);
    setDraftName(displayName);
    setDraftRelations(parseRelationTypes(relationType));
    setDraftBirthday(birthday ?? "");
  };

  const saveEdit = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave({
        displayName: trimmed,
        relationType: serializeRelationTypes(draftRelations),
        birthday: draftBirthday.trim() || null,
        birthdayYearKnown: true,
      });
      triggerMedium();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const headerBody = editing ? (
    <View className="pb-1">
      <TextInput
        value={draftName}
        onChangeText={setDraftName}
        autoFocus
        placeholder={t("personForm.fullName")}
        placeholderTextColor="#7A8CAD"
        className={`${fieldClass} mt-0 text-2xl font-heading`}
      />
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mt-3 mb-2">
        {t("personForm.relationType")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {RELATION_CATEGORIES.map((cat) => {
          const selected = draftRelations.includes(cat.value);
          return (
            <Pressable
              key={cat.value}
              onPress={() => {
                triggerSelection();
                setDraftRelations((prev) => toggleRelationCategory(prev, cat.value));
              }}
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
      <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mt-3 mb-1">
        🎂 {t("personForm.birthday")}
      </Text>
      <BirthdayField
        birthday={draftBirthday}
        onBirthdayChange={setDraftBirthday}
        fieldClass={fieldClass}
      />
      <View className="flex-row gap-2 mt-3">
        <Pressable
          onPress={() => void saveEdit()}
          disabled={saving}
          className="flex-1 bg-accent rounded-lg py-2.5 items-center active:opacity-80"
        >
          <Text className="text-sm text-card font-bodySemi">
            {saving ? t("personForm.saving") : t("people.saveProfile")}
          </Text>
        </Pressable>
        <Pressable
          onPress={cancelEdit}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg border border-border active:opacity-80"
        >
          <Text className="text-sm text-text3 font-body">✕</Text>
        </Pressable>
      </View>
    </View>
  ) : (
    <View>
      <Text className="text-3xl leading-[36px] text-text1 font-heading">{displayName}</Text>
      {relationLabel || age !== null ? (
        <Text className="text-body-lg text-text2 font-bodyMedium mt-1.5">
          {relationLabel ?? ""}
          {relationLabel && age !== null ? " · " : ""}
          {age !== null ? t("people.years", { count: age }) : ""}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-row items-start gap-4 pt-2 pb-2">
      {monogram}
      <View className="flex-1">{headerBody}</View>
    </View>
  );
});
