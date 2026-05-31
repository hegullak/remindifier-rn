import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import { parseRemindifierQrPayload } from "@/lib/me/qr-payload";
import { AppShell } from "@/ui/AppShell";
import { Button } from "@/ui/Button";

export default function MeScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handlingRef = useRef(false);

  async function ensurePermission() {
    if (permission?.granted) return true;
    const result = await requestPermission();
    return result.granted;
  }

  function handleBarcode(raw: string) {
    if (handlingRef.current || scanned) return;
    handlingRef.current = true;

    const payload = parseRemindifierQrPayload(raw);
    if (!payload) {
      setErrorMessage(t("scan.invalidQr"));
      handlingRef.current = false;
      return;
    }

    setScanned(true);
    router.replace({
      pathname: "/(tabs)/people/new",
      params: {
        prefillName: payload.name,
        prefillBirthday: payload.birthday ?? "",
        prefillBirthdayYearKnown: String(payload.birthdayYearKnown ?? true),
        prefillAbout: payload.about ?? "",
        prefillContact: payload.contact ?? "",
      },
    });
  }

  if (!permission) {
    return (
      <AppShell>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-body-lg text-text2 font-body text-center">
            {t("scan.loadingCamera")}
          </Text>
        </View>
      </AppShell>
    );
  }

  if (!permission.granted) {
    return (
      <AppShell>
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-body-lg text-text2 font-body text-center">
            {t("scan.permissionBody")}
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              void ensurePermission();
            }}
          >
            {t("scan.grantCamera")}
          </Button>
          <Button variant="ghost" onPress={() => router.back()}>
            {t("common.cancel")}
          </Button>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell showThemeToggle={false}>
      <View className="flex-1">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : ({ data }) => handleBarcode(data)}
        />
        <View className="absolute top-0 left-0 right-0 px-4 pt-2">
          <Pressable onPress={() => router.back()} className="self-start py-2">
            <Text className="text-sm text-card font-bodyMedium">{t("common.cancel")}</Text>
          </Pressable>
        </View>
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-10 items-center">
          <Text className="text-sm text-card font-body text-center mb-2">
            {t("scan.holdQr")}
          </Text>
          {errorMessage ? (
            <View className="bg-card rounded-xl px-4 py-3 w-full">
              <Text className="text-sm text-red font-body text-center">{errorMessage}</Text>
              <Pressable
                onPress={() => {
                  setErrorMessage(null);
                  handlingRef.current = false;
                }}
                className="mt-2 self-center"
              >
                <Text className="text-body text-accent font-bodyMedium">
                  {t("scan.tryAgain")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </AppShell>
  );
}
