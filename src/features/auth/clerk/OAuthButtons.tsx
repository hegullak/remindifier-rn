import { useSignInWithApple, useSSO } from "@clerk/clerk-expo";
import type { OAuthStrategy } from "@clerk/types";
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { getClerkRedirectUrl } from "@/features/auth/clerk/config";
import { clerkErrorMessage } from "@/features/auth/clerk/errors";
import { useTranslation } from "@/i18n/LanguageContext";

type OAuthProvider = {
  strategy: OAuthStrategy;
  labelKey: "oauth.continueGoogle" | "oauth.continueApple";
  nativeApple?: boolean;
};

export function OAuthButtons({ onError }: { onError: (message: string | null) => void }) {
  const { t } = useTranslation();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [loadingStrategy, setLoadingStrategy] = useState<OAuthStrategy | null>(null);

  const providers = useMemo<OAuthProvider[]>(
    () => [
      { strategy: "oauth_google", labelKey: "oauth.continueGoogle" },
      { strategy: "oauth_apple", labelKey: "oauth.continueApple", nativeApple: true },
    ],
    [],
  );

  async function runOAuth(provider: OAuthProvider) {
    onError(null);
    setLoadingStrategy(provider.strategy);
    try {
      const redirectUrl = getClerkRedirectUrl();

      if (provider.nativeApple && Platform.OS === "ios") {
        const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          return;
        }
        onError(t("oauth.appleCancelled"));
        return;
      }

      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy: provider.strategy,
        redirectUrl,
      });

      if (authSessionResult?.type === "cancel" || authSessionResult?.type === "dismiss") {
        onError(null);
        return;
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return;
      }

      onError(t("oauth.incomplete"));
    } catch (error: unknown) {
      onError(clerkErrorMessage(error, t("oauth.signInFailed")));
    } finally {
      setLoadingStrategy(null);
    }
  }

  return (
    <View className="gap-3">
      {providers.map((provider) => {
        const loading = loadingStrategy === provider.strategy;
        return (
          <Pressable
            key={provider.strategy}
            onPress={() => runOAuth(provider)}
            disabled={loadingStrategy !== null}
            className="min-h-[52px] rounded-2xl border border-bg2 bg-card px-5 py-3.5 justify-center disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#C4784A" />
            ) : (
              <Text className="text-center text-base text-text1 font-bodyMedium">
                {t(provider.labelKey)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
