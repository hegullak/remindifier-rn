import { useAuth } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { Link, router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { deleteAllData, exportAllData } from "@/db/repos/settingsRepo";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";
import { clearClerkAuthStorage } from "@/features/auth/clerk/clearAuthStorage";
import { useMyProfile } from "@/features/me/useMyProfile";
import { getLastErrorTimestamp } from "@/lib/logUtils";
import { encodeRemindifierQrPayload } from "@/lib/me/qr-payload";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { QrCodeView } from "@/ui/QrCodeView";
import { SectionLabel } from "@/ui/SectionLabel";

const fieldClass =
  "mt-2 bg-bg2 border border-border rounded-md px-3 py-3 text-[14px] text-text1 font-body";

function formatBirthday(birthday: string | null, yearKnown: boolean | null) {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return birthday;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(yearKnown ? { year: "numeric" } : {}),
  });
}

const PRIVACY_PARAGRAPHS = [
  "All data lagres på denne enheten i en kryptert database.\nVi ser aldri dine notater, personer eller observasjoner.",
  "iCloud-synkronisering sender data til ditt eget iCloud —\nkryptert av Apple. Vi har ikke tilgang.",
  "Ingen analyse, ingen sporing, ingen tredjepart.",
] as const;

export default function MeScreen() {
  const { userId, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const { db, loading: dbLoading } = useUserDrizzleDb(userId);
  const { profile, loading, error, save, defaultDisplayName } = useMyProfile(userId);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayYearKnown, setBirthdayYearKnown] = useState(true);
  const [about, setAbout] = useState("");
  const [contactPreference, setContactPreference] = useState("");

  const appVersion = Constants.expoConfig?.version ?? "—";

  useEffect(() => {
    getLastErrorTimestamp().then(setLastError);
  }, []);

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
      setSaveError("Navn er påkrevd.");
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
      setSaveError(err instanceof Error ? err.message : "Kunne ikke lagre profil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!db) {
      Alert.alert("Eksporter", "Databasen er ikke klar ennå. Prøv igjen om et øyeblikk.");
      return;
    }
    setExporting(true);
    try {
      const payload = await exportAllData(db);
      const json = JSON.stringify(payload, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      const filePath = `${FileSystem.cacheDirectory}remindifier-export-${date}.json`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Eksporter", `Fil lagret:\n${filePath}`);
        return;
      }
      await Sharing.shareAsync(filePath, {
        mimeType: "application/json",
        UTI: "public.json",
      });
    } catch (err: unknown) {
      Alert.alert("Eksporter", err instanceof Error ? err.message : "Kunne ikke eksportere data.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAll() {
    if (!db) return;
    setDeletingAll(true);
    try {
      await deleteAllData(db);
      setShowDeleteSheet(false);
      try {
        await signOut();
      } catch {
        // Session may already be cleared.
      }
      await clearClerkAuthStorage();
      router.replace("/");
    } catch (err: unknown) {
      Alert.alert(
        "Slett data",
        err instanceof Error ? err.message : "Kunne ikke slette alle data.",
      );
    } finally {
      setDeletingAll(false);
    }
  }

  const birthdayLabel = formatBirthday(viewProfile.birthday, viewProfile.birthdayYearKnown);
  const profileLoading = loading || dbLoading;

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View className="flex-row items-start justify-between pt-1 pb-3">
          <View className="flex-1">
            <Link href="/(tabs)/brief" className="text-[12px] text-accent font-bodyMedium">
              ← Tilbake
            </Link>
            <Text className="text-[30px] leading-[36px] text-text1 font-heading mt-2">Meg</Text>
          </View>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)} className="py-2">
              <Text className="text-[12px] text-accent font-bodyMedium">Rediger</Text>
            </Pressable>
          ) : null}
        </View>

        {profileLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color="#C4784A" />
        ) : null}
        {error ? <Text className="text-[13px] text-red font-body mb-3">{error}</Text> : null}

        {!profileLoading && !editing ? (
          <View className="gap-3">
            <Text className="text-[32px] leading-[38px] text-text1 font-heading">
              {viewProfile.displayName}
            </Text>
            {birthdayLabel ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  Bursdag
                </Text>
                <Text className="text-[15px] text-text2 font-body mt-1">{birthdayLabel}</Text>
              </View>
            ) : null}
            {viewProfile.about ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  Om meg
                </Text>
                <Text className="text-[15px] text-text2 font-body mt-1 leading-[22px]">
                  {viewProfile.about}
                </Text>
              </View>
            ) : null}
            {viewProfile.contactPreference ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  Foretrukket kontakt
                </Text>
                <Text className="text-[15px] text-text2 font-body mt-1">
                  {viewProfile.contactPreference}
                </Text>
              </View>
            ) : null}

            <Card style={{ alignItems: "center", paddingVertical: 20 }}>
              <QrCodeView value={qrValue} size={220} />
              <Text className="text-[12px] text-text3 font-body mt-3 text-center">
                Del denne koden så andre kan legge deg til i Remindifier
              </Text>
            </Card>

            <Button variant="secondary" onPress={() => router.push("/me-scan")}>
              Scan andres kode
            </Button>
          </View>
        ) : null}

        {!profileLoading && editing ? (
          <View>
            <Card style={{ marginBottom: 12 }}>
              <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
                Navn
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ditt navn"
                placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
                className={fieldClass}
              />
              <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-4">
                Foretrukket kontakt
              </Text>
              <TextInput
                value={contactPreference}
                onChangeText={setContactPreference}
                placeholder="SMS, e-post, telefon…"
                placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
                className={fieldClass}
              />
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
                Bursdag
              </Text>
              <TextInput
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
                className={fieldClass}
              />
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-[12px] text-text2 font-body">Year is known</Text>
                <Switch value={birthdayYearKnown} onValueChange={setBirthdayYearKnown} />
              </View>
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
                Om meg
              </Text>
              <TextInput
                value={about}
                onChangeText={setAbout}
                placeholder="Hva du vil at andre skal huske om deg"
                placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
                multiline
                numberOfLines={5}
                className={fieldClass}
                style={{ textAlignVertical: "top", minHeight: 110 }}
              />
            </Card>

            {saveError ? (
              <Text className="text-[13px] text-red font-body mb-2">{saveError}</Text>
            ) : null}

            <Button variant="primary" onPress={handleSave} loading={saving} disabled={saving}>
              Lagre
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
                Avbryt
              </Button>
            </View>
          </View>
        ) : null}

        <Card style={{ marginTop: 8 }}>
          <SectionLabel style={{ marginTop: 0 }}>Personvern & sikkerhet</SectionLabel>
          {PRIVACY_PARAGRAPHS.map((paragraph) => (
            <Text
              key={paragraph.slice(0, 24)}
              className="text-[14px] text-text2 font-body mt-2 leading-[21px]"
            >
              {paragraph}
            </Text>
          ))}
        </Card>

        <SectionLabel>Dine data</SectionLabel>
        {lastError ? (
          <Text className="text-[12px] text-text3 font-body mb-3">
            Siste feil registrert: {new Date(lastError).toLocaleString("nb-NO")}
          </Text>
        ) : null}
        <View className="gap-3">
          <Button
            variant="secondary"
            onPress={handleExport}
            loading={exporting}
            disabled={exporting}
          >
            Eksporter alle data
          </Button>
          <Button variant="secondary" onPress={() => setShowDeleteSheet(true)}>
            Slett alle data
          </Button>
        </View>

        <Card style={{ marginTop: 8 }}>
          <SectionLabel style={{ marginTop: 0 }}>Om appen</SectionLabel>
          <Text className="text-[14px] text-text2 font-body mt-2">Versjon {appVersion}</Text>
          <Text className="text-[12px] text-text3 font-body mt-3 leading-[18px]">
            remindifier er et personlig hukommelsesverktøy. Appen gir ikke medisinske, juridiske
            eller psykologiske råd. All informasjon du legger inn brukes kun til å hjelpe deg med å
            huske.
          </Text>
        </Card>
      </ScrollView>

      <BottomSheet
        visible={showDeleteSheet}
        onDismiss={() => setShowDeleteSheet(false)}
        title="Slett alt?"
      >
        <Text className="text-[14px] text-text2 font-body mb-4 leading-[21px]">
          Dette sletter alle personer, notater og innstillinger fra denne enheten. Dette kan ikke
          angres.{"\n\n"}
          Hvis du bruker iCloud, må du slette iCloud-dataene manuelt under iOS-innstillinger →
          iCloud → Administrer lagring.
        </Text>
        <View className="gap-2">
          <Pressable
            onPress={handleDeleteAll}
            disabled={deletingAll}
            className="bg-red rounded-lg py-3 items-center opacity-100 disabled:opacity-60"
          >
            {deletingAll ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-[14px] text-white font-bodySemi">Slett alt</Text>
            )}
          </Pressable>
          <Button variant="ghost" onPress={() => setShowDeleteSheet(false)} disabled={deletingAll}>
            Avbryt
          </Button>
        </View>
      </BottomSheet>
    </AppShell>
  );
}
