import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Switch, Text, View } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  applyYearKnownToIso,
  formatBirthdayLabel,
  isoToPickerDate,
  pickerDateToIso,
} from "@/lib/birthdayForm";

type Props = {
  birthday: string;
  birthdayYearKnown: boolean;
  onBirthdayChange: (iso: string) => void;
  onBirthdayYearKnownChange: (known: boolean) => void;
  fieldClass: string;
};

export function BirthdayField({
  birthday,
  birthdayYearKnown,
  onBirthdayChange,
  onBirthdayYearKnownChange,
  fieldClass,
}: Props) {
  const { t, locale } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  const pickerValue = birthday
    ? isoToPickerDate(birthday, birthdayYearKnown)
    : new Date(2000, 0, 1);
  const label = birthday
    ? formatBirthdayLabel(birthday, birthdayYearKnown, locale)
    : t("personForm.birthdayPlaceholder");

  return (
    <>
      <Pressable
        onPress={() => setShowPicker((v) => !v)}
        className={`${fieldClass} justify-center`}
        accessibilityRole="button"
      >
        <Text className={`text-sm font-body ${birthday ? "text-text1" : "text-text3"}`}>
          {label}
        </Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          key={`${birthday}-${String(birthdayYearKnown)}`}
          value={pickerValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            if (Platform.OS === "android") setShowPicker(false);
            if (event.type === "dismissed" || !date) return;
            onBirthdayChange(pickerDateToIso(date, birthdayYearKnown));
          }}
        />
      ) : null}
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-xs text-text2 font-body">{t("personForm.yearKnown")}</Text>
        <Switch
          value={birthdayYearKnown}
          onValueChange={(known) => {
            onBirthdayYearKnownChange(known);
            if (birthday) onBirthdayChange(applyYearKnownToIso(birthday, known));
          }}
        />
      </View>
    </>
  );
}
