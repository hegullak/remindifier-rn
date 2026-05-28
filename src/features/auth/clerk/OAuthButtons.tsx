import { useSignInWithApple, useSSO } from "@clerk/clerk-expo";
import type { OAuthStrategy } from "@clerk/types";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { getClerkRedirectUrl } from "@/features/auth/clerk/config";
import { clerkErrorMessage } from "@/features/auth/clerk/errors";

type OAuthProvider = {
  strategy: OAuthStrategy;
  label: string;
  /** iOS: prefer native Sign in with Apple when available */
  nativeApple?: boolean;
};

const PROVIDERS: OAuthProvider[] = [
  { strategy: "oauth_google", label: "Fortsett med Google" },
  { strategy: "oauth_apple", label: "Fortsett med Apple", nativeApple: true },
];

export function OAuthButtons({ onError }: { onError: (message: string | null) => void }) {
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [loadingStrategy, setLoadingStrategy] = useState<OAuthStrategy | null>(null);

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
        onError("Apple-innlogging ble avbrutt.");
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

      onError("Innlogging med ekstern leverandør fullførte ikke. Prøv igjen.");
    } catch (error: unknown) {
      onError(clerkErrorMessage(error, "Kunne ikke logge inn med ekstern konto."));
    } finally {
      setLoadingStrategy(null);
    }
  }

  return (
    <View className="gap-3">
      {PROVIDERS.map((provider) => {
        const loading = loadingStrategy === provider.strategy;
        return (
          <Pressable
            key={provider.strategy}
            onPress={() => runOAuth(provider)}
            disabled={loadingStrategy !== null}
            className="min-h-[52px] rounded-2xl border border-border bg-card px-5 py-3 justify-center disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text className="text-center text-[16px] text-text1 font-bodyMedium">
                {provider.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
