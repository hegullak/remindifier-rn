import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "@/i18n";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";
import { useAppTheme } from "@/theme/ThemeProvider";
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
  inputBg,
  inputColor,
  inputBorder,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  inputBg: string;
  inputColor: string;
  inputBorder: string;
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
          multiline
          textAlignVertical="top"
          style={{
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor: inputBorder,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 15,
            color: inputColor,
            minHeight: 44,
          }}
        />
      ) : (
        <Text style={{ fontSize: 15, color: inputColor }}>{value || "—"}</Text>
      )}
    </View>
  );
}

export function SemanticIntakePreviewCard({ parsed, editing, values, onChange }: Props) {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const followUpLines = values.followUpText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const ambiguityLabels = parsed.ambiguities
    .filter((key) => key !== "datetime_conflict")
    .map((key) => t(`intake.ambiguity.${key}`));

  const datetimeOptions = parsed.scheduledAtOptions ?? [];
  const showDatetimePicker =
    !editing && datetimeOptions.length >= 2 && parsed.ambiguities.includes("datetime_conflict");

  const inputBg = isDark ? "#222838" : "#EFECE3";
  const inputColor = isDark ? "#EEF0F5" : "#1C1915";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";

  return (
    <BriefCard stripeColor="sage">
      <Text className="text-body text-text2 font-body mb-3">{t("intake.previewHint")}</Text>

      <PreviewRow
        label={t("intake.field.event")}
        value={values.eventTitle}
        editing={editing}
        onChangeText={(eventTitle) => onChange({ ...values, eventTitle })}
        placeholder={t("intake.field.event")}
        inputBg={inputBg}
        inputColor={inputColor}
        inputBorder={inputBorder}
      />
      {showDatetimePicker ? (
        <View className="mb-3">
          <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
            {t("intake.field.datetime")}
          </Text>
          <Text className="text-body text-text2 font-body mb-2">
            {t("intake.datetimeConflictHint")}
          </Text>
          {datetimeOptions.map((option) => {
            const selected = values.scheduledLabel === option.label;
            return (
              <Pressable
                key={option.label}
                onPress={() => onChange({ ...values, scheduledLabel: option.label })}
                style={{
                  backgroundColor: selected ? (isDark ? "#2E3A52" : "#E2DDD2") : inputBg,
                  borderWidth: 1,
                  borderColor: selected ? (isDark ? "#6B8F71" : "#5A7A60") : inputBorder,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontSize: 15, color: inputColor, fontWeight: selected ? "600" : "400" }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <PreviewRow
          label={t("intake.field.datetime")}
          value={values.scheduledLabel}
          editing={editing}
          onChangeText={(scheduledLabel) => onChange({ ...values, scheduledLabel })}
          placeholder={t("intake.field.datetime")}
          inputBg={inputBg}
          inputColor={inputColor}
          inputBorder={inputBorder}
        />
      )}
      <PreviewRow
        label={t("intake.field.person")}
        value={values.personName}
        editing={editing}
        onChangeText={(personName) => onChange({ ...values, personName })}
        placeholder={t("intake.field.person")}
        inputBg={inputBg}
        inputColor={inputColor}
        inputBorder={inputBorder}
      />

      {followUpLines.length > 0 || editing ? (
        <View className="mb-3">
          <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
            {t("intake.field.followUp")}
          </Text>
          {editing ? (
            <TextInput
              value={values.followUpText}
              onChangeText={(followUpText) => onChange({ ...values, followUpText })}
              placeholder={t("intake.followUpPlaceholder")}
              placeholderTextColor="#7A8CAD"
              multiline
              textAlignVertical="top"
              style={{
                backgroundColor: inputBg,
                borderWidth: 1,
                borderColor: inputBorder,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 15,
                color: inputColor,
                minHeight: 72,
              }}
            />
          ) : (
            followUpLines.map((line) => (
              <Text key={line} style={{ fontSize: 15, color: inputColor, marginBottom: 4 }}>
                • {line}
              </Text>
            ))
          )}
        </View>
      ) : null}

      {!parsed.event && !parsed.person && parsed.freeFormNote ? (
        <View className="mb-3">
          <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
            {t("intake.field.note")}
          </Text>
          <Text className="text-body-lg text-text1 font-body">{parsed.freeFormNote}</Text>
        </View>
      ) : null}

      {parsed.ambiguities.includes("datetime_conflict") ? (
        <View className="mt-2 pt-2 border-t border-border">
          <Text className="text-xs text-text3 font-body">
            {t("intake.ambiguity.datetime_conflict")}
          </Text>
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
