import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { parseRemindifierQrPayload } from "@/lib/me/qr-payload";
import { AppShell } from "@/ui/AppShell";
import { Button } from "@/ui/Button";

export default function MeScanScreen() {
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
      setErrorMessage("Dette er ikke en gyldig Remindifier QR-kode. Prøv igjen.");
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
          <Text className="text-[15px] text-text2 font-body text-center">Laster kamera…</Text>
        </View>
      </AppShell>
    );
  }

  if (!permission.granted) {
    return (
      <AppShell>
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-[15px] text-text2 font-body text-center">
            Vi trenger tilgang til kameraet for å skanne QR-koder.
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              void ensurePermission();
            }}
          >
            Gi kameratilgang
          </Button>
          <Button variant="ghost" onPress={() => router.back()}>
            Avbryt
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
            <Text className="text-[14px] text-card font-bodyMedium">← Avbryt</Text>
          </Pressable>
        </View>
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-10 items-center">
          <Text className="text-[14px] text-card font-body text-center mb-2">
            Hold QR-koden innenfor rammen
          </Text>
          {errorMessage ? (
            <View className="bg-card rounded-xl px-4 py-3 w-full">
              <Text className="text-[14px] text-red font-body text-center">{errorMessage}</Text>
              <Pressable
                onPress={() => {
                  setErrorMessage(null);
                  handlingRef.current = false;
                }}
                className="mt-2 self-center"
              >
                <Text className="text-[13px] text-accent font-bodyMedium">Prøv igjen</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </AppShell>
  );
}
