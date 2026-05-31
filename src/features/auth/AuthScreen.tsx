import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OAuthButtons } from "@/features/auth/clerk/OAuthButtons";
import { useWarmUpBrowser } from "@/features/auth/clerk/useWarmUpBrowser";
import { SignInScreen } from "@/features/auth/SignInScreen";
import { SignUpScreen } from "@/features/auth/SignUpScreen";
import { useTranslation } from "@/i18n";
import { LanguagePicker } from "@/ui/LanguagePicker";

type AuthMode = "signIn" | "signUp";

const oauthEnabled = process.env.EXPO_PUBLIC_CLERK_OAUTH_ENABLED === "true";

export function AuthScreen() {
  useWarmUpBrowser();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [oauthError, setOauthError] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-row justify-end mb-2">
            <LanguagePicker />
          </View>
          <Text className="text-[34px] leading-[40px] text-text1 font-heading">remindifier</Text>
          <Text className="text-[17px] leading-[24px] text-text2 font-body mt-4 max-w-[340px]">
            {mode === "signIn" ? t("auth.taglineSignIn") : t("auth.taglineSignUp")}
          </Text>

          {oauthEnabled ? (
            <>
              <View className="mt-8">
                <OAuthButtons onError={setOauthError} />
                {oauthError ? (
                  <View className="rounded-xl bg-redLight px-4 py-3 mt-3">
                    <Text className="text-body-lg leading-[22px] text-red font-body">
                      {oauthError}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center gap-3 my-8">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-body text-text3 font-body">{t("common.or")}</Text>
                <View className="flex-1 h-px bg-border" />
              </View>
            </>
          ) : null}

          <View className="flex-row rounded-2xl bg-bg2 p-1 mb-4">
            {(["signIn", "signUp"] as const).map((tab) => {
              const active = mode === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setMode(tab);
                    setOauthError(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl ${active ? "bg-card" : ""}`}
                >
                  <Text
                    className={`text-center text-body-lg font-bodyMedium ${
                      active ? "text-text1" : "text-text3"
                    }`}
                  >
                    {tab === "signIn" ? t("auth.signIn") : t("auth.signUp")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === "signIn" ? <SignInScreen /> : <SignUpScreen />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
