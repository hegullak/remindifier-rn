import { Text, View } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";
import type { ParsedPersonDraft } from "@/lib/people/naturalLanguageParser";
import { Card } from "@/ui/Card";

type Props = {
  draft: ParsedPersonDraft;
};

export function ParsedPersonPreviewCard({ draft }: Props) {
  const { t } = useTranslation();

  return (
    <Card style={{ marginBottom: 12, borderRadius: 18 }}>
      <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
        {t("people.parsedFrom")}
      </Text>
      <View className="mt-3 gap-2">
        {draft.displayName ? (
          <PreviewRow label={t("personForm.fullName")} value={draft.displayName} />
        ) : null}
        {draft.relationType ? (
          <PreviewRow label={t("personForm.relationType")} value={draft.relationType} />
        ) : null}
        {draft.birthday ? (
          <PreviewRow label={t("personForm.birthday")} value={draft.birthday} />
        ) : null}
        {draft.funFacts.length > 0 ? (
          <View>
            <Text className="text-[11px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
              {t("personForm.funFacts")}
            </Text>
            {draft.funFacts.map((fact) => (
              <Text key={fact} className="text-[14px] text-text2 font-body mt-1">
                · {fact}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
        {label}
      </Text>
      <Text className="text-[15px] text-text1 font-bodyMedium mt-0.5">{value}</Text>
    </View>
  );
}
