import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { useMyProfile } from "@/features/me/useMyProfile";
import { useTranslation } from "@/i18n";
import type { Locale } from "@/i18n/types";
import { encodeRemindifierQrPayload } from "@/lib/me/qr-payload";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { QrCodeView } from "@/ui/QrCodeView";

const fieldClass =
  "mt-2 bg-bg2 border border-border rounded-md px-3 py-3 text-sm text-text1 font-body";

function formatBirthday(birthday: string | null, yearKnown: boolean | null, locale: Locale) {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return birthday;
  return date.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", {
    day: "numeric",
    month: "long",
    ...(yearKnown ? { year: "numeric" } : {}),
  });
}

export function MyselfProfileScreen() {
  const { t, locale } = useTranslation();
  const { userId } = useAppAuth();
  const colorScheme = useColorScheme();
  const { profile, loading, error, save, defaultDisplayName } = useMyProfile(userId);
  const [editing, setEditing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayYearKnown, setBirthdayYearKnown] = useState(true);
  const [about, setAbout] = useState("");
  const [contactPreference, setContactPreference] = useState("");

  useEffect(() => {
    if (!profile && !loading) {
      setDisplayName(defaultDisplayName);
      return;
    }
    if (!profile) return;
    setDisplayName(profile.displayName);
    setBirthday(profile.birthday ?? "");
    setBirthdayYearKnown(profile.birthdayYearKnown ?? false);
    setAbout(profile.about ?? "");
    setContactPreference(profile.contactPreference ?? "");
  }, [profile, loading, defaultDisplayName]);

  const viewProfile = profile ?? {
    userId: userId ?? "",
    displayName: displayName || defaultDisplayName,
    birthday: birthday || null,
    birthdayYearKnown,
    about: about || null,
    contactPreference: contactPreference || null,
  };

  const qrValue = useMemo(() => encodeRemindifierQrPayload(viewProfile), [viewProfile]);

  async function handleSave() {
    if (!displayName.trim()) {
      setSaveError(t("common.nameRequired"));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await save({
        displayName: displayName.trim(),
        birthday: birthday.trim() || null,
        birthdayYearKnown,
        about: about.trim() || null,
        contactPreference: contactPreference.trim() || null,
      });
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("myself.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const birthdayLabel = formatBirthday(viewProfile.birthday, viewProfile.birthdayYearKnown, locale);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <View className="flex-row items-start justify-between pt-1 pb-3">
        <Text className="text-3xl leading-[36px] text-text1 font-heading">
          {t("myself.title")}
        </Text>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)} className="py-2">
            <Text className="text-xs text-accent font-bodyMedium">{t("common.edit")}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <ActivityIndicator style={{ marginVertical: 24 }} color="#C4784A" /> : null}
      {error ? <Text className="text-body text-red font-body mb-3">{error}</Text> : null}

      {!loading && !editing ? (
        <View className="gap-3">
          <Text className="text-[32px] leading-[38px] text-text1 font-heading">
            {viewProfile.displayName}
          </Text>
          {birthdayLabel ? (
            <View>
              <Text className="text-2xs uppercase tracking-[1.2px] text-text3 font-bodySemi">
                {t("myself.birthday")}
              </Text>
              <Text className="text-body-lg text-text2 font-body mt-1">{birthdayLabel}</Text>
            </View>
          ) : null}
          {viewProfile.about ? (
            <View>
              <Text className="text-2xs uppercase tracking-[1.2px] text-text3 font-bodySemi">
                {t("myself.about")}
              </Text>
              <Text className="text-body-lg text-text2 font-body mt-1 leading-[22px]">
                {viewProfile.about}
              </Text>
            </View>
          ) : null}
          {viewProfile.contactPreference ? (
            <View>
              <Text className="text-2xs uppercase tracking-[1.2px] text-text3 font-bodySemi">
                {t("myself.preferredContact")}
              </Text>
              <Text className="text-body-lg text-text2 font-body mt-1">
                {viewProfile.contactPreference}
              </Text>
            </View>
          ) : null}

          <Button variant="secondary" onPress={() => setQrVisible((v) => !v)}>
            {qrVisible ? t("myself.hideQr") : t("myself.showQr")}
          </Button>

          {qrVisible ? (
            <Card style={{ alignItems: "center", paddingVertical: 20 }}>
              <QrCodeView value={qrValue} size={220} />
              <Text className="text-xs text-text3 font-body mt-3 text-center">
                {t("myself.qrHint")}
              </Text>
            </Card>
          ) : null}

          <Button variant="secondary" onPress={() => router.push("/me-scan")}>
            {t("myself.scanOther")}
          </Button>
        </View>
      ) : null}

      {!loading && editing ? (
        <View>
          <Card style={{ marginBottom: 12 }}>
            <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi">
              {t("myself.name")}
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t("myself.namePlaceholder")}
              placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
              className={fieldClass}
            />
            <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mt-4">
              {t("myself.preferredContact")}
            </Text>
            <TextInput
              value={contactPreference}
              onChangeText={setContactPreference}
              placeholder={t("myself.contactPlaceholder")}
              placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
              className={fieldClass}
            />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi">
              {t("myself.birthday")}
            </Text>
            <TextInput
              value={birthday}
              onChangeText={setBirthday}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
              className={fieldClass}
            />
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-xs text-text2 font-body">{t("myself.yearKnown")}</Text>
              <Switch value={birthdayYearKnown} onValueChange={setBirthdayYearKnown} />
            </View>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi">
              {t("myself.about")}
            </Text>
            <TextInput
              value={about}
              onChangeText={setAbout}
              placeholder={t("myself.aboutPlaceholder")}
              placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
              multiline
              numberOfLines={5}
              className={fieldClass}
              style={{ textAlignVertical: "top", minHeight: 110 }}
            />
          </Card>

          {saveError ? (
            <Text className="text-body text-red font-body mb-2">{saveError}</Text>
          ) : null}

          <Button variant="primary" onPress={handleSave} loading={saving} disabled={saving}>
            {t("common.save")}
          </Button>
          <View className="mt-2">
            <Button
              variant="ghost"
              onPress={() => {
                setEditing(false);
                setSaveError(null);
              }}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
