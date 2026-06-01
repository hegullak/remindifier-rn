import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import {
  formatBirthdayLabel,
  isoToPickerDate,
  pickerDateToIso,
} from "@/lib/birthdayForm";

type Props = {
  birthday: string;
  onBirthdayChange: (iso: string) => void;
  fieldClass: string;
};

export function BirthdayField({ birthday, onBirthdayChange, fieldClass }: Props) {
  const { t, locale } = useTranslation();
  const { isDark } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);

  const pickerValue = birthday ? isoToPickerDate(birthday, true) : new Date(2000, 0, 1);
  const label = birthday
    ? formatBirthdayLabel(birthday, true, locale)
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
          key={birthday}
          value={pickerValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={isDark ? "dark" : "light"}
          onChange={(event, date) => {
            if (Platform.OS === "android") setShowPicker(false);
            if (event.type === "dismissed" || !date) return;
            onBirthdayChange(pickerDateToIso(date, true));
          }}
        />
      ) : null}
    </>
  );
}
