import { Text, TextInput, View } from "react-native";
import { useTranslation } from "@/i18n";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";
import { BriefCard } from "@/ui/BriefCard";

type EditableValues = {
  eventTitle: string;
  personName: string;
  scheduledLabel: string;
  followUpText: string;
};

type Props = {
  parsed: SemanticIntakeParseResult;
  editing: boolean;
  values: EditableValues;
  onChange: (next: EditableValues) => void;
};

function PreviewRow({
  label,
  value,
  editing,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}) {
  if (!value && !editing) return null;

  return (
    <View className="mb-3 last:mb-0">
      <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
        {label}
      </Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#7A8CAD"
          className="bg-bg2 border border-border rounded-lg px-3 py-2 text-body-lg text-text1 font-body"
        />
      ) : (
        <Text className="text-body-lg text-text1 font-body">{value || "—"}</Text>
      )}
    </View>
  );
}

export function SemanticIntakePreviewCard({ parsed, editing, values, onChange }: Props) {
  const { t } = useTranslation();

  const ambiguityLabels = parsed.ambiguities.map((key) => t(`intake.ambiguity.${key}`));

  return (
    <BriefCard stripeColor="sage">
      <Text className="text-body text-text2 font-body mb-3">{t("intake.previewHint")}</Text>

      <PreviewRow
        label={t("intake.field.event")}
        value={values.eventTitle}
        editing={editing}
        onChangeText={(eventTitle) => onChange({ ...values, eventTitle })}
        placeholder={t("intake.field.event")}
      />
      <PreviewRow
        label={t("intake.field.datetime")}
        value={values.scheduledLabel}
        editing={editing}
        onChangeText={(scheduledLabel) => onChange({ ...values, scheduledLabel })}
        placeholder={t("intake.field.datetime")}
      />
      <PreviewRow
        label={t("intake.field.person")}
        value={values.personName}
        editing={editing}
        onChangeText={(personName) => onChange({ ...values, personName })}
        placeholder={t("intake.field.person")}
      />
      <PreviewRow
        label={t("intake.field.followUp")}
        value={values.followUpText}
        editing={editing}
        onChangeText={(followUpText) => onChange({ ...values, followUpText })}
        placeholder={t("intake.field.followUp")}
      />

      {!parsed.event && !parsed.person && parsed.freeFormNote ? (
        <View className="mb-3">
          <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
            {t("intake.field.note")}
          </Text>
          <Text className="text-body-lg text-text1 font-body">{parsed.freeFormNote}</Text>
        </View>
      ) : null}

      {ambiguityLabels.length > 0 ? (
        <View className="mt-2 pt-2 border-t border-border">
          <Text className="text-xs text-text3 font-body">{ambiguityLabels.join(" · ")}</Text>
        </View>
      ) : null}
    </BriefCard>
  );
}

export function valuesFromParse(parsed: SemanticIntakeParseResult): EditableValues {
  return {
    eventTitle: parsed.event?.title ?? "",
    personName: parsed.person?.name ?? "",
    scheduledLabel: parsed.scheduledAt?.label ?? "",
    followUpText: parsed.followUps.map((f) => f.text).join("\n"),
  };
}
