import { useAuth, useSignIn } from "@clerk/clerk-expo";
import type { SignInResource } from "@clerk/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import {
  authCodeInputClassName,
  authCodeInputStyle,
  authInputClassName,
  authLabelClassName,
  authPlaceholderColor,
} from "@/features/auth/authStyles";
import { clearClerkAuthStorage } from "@/features/auth/clerk/clearAuthStorage";
import { clerkErrorMessage } from "@/features/auth/clerk/errors";
import {
  activateClerkSession,
  isSessionExistsError,
  resolveSignInStep,
  signInStatusMessage,
} from "@/features/auth/clerk/session";

type SecondFactor = NonNullable<SignInResource["supportedSecondFactors"]>[number];
type FirstFactor = NonNullable<SignInResource["supportedFirstFactors"]>[number];

function strategyLabel(strategy: string) {
  switch (strategy) {
    case "totp":
      return "Autentiseringsapp";
    case "phone_code":
      return "SMS-kode";
    case "email_code":
      return "E-postkode";
    case "backup_code":
      return "Backup-kode";
    default:
      return strategy;
  }
}

function strategyHint(strategy: string, codeSent: boolean) {
  switch (strategy) {
    case "totp":
      return "Åpne Google Authenticator, 1Password eller lignende. Velg kontoen for remindifier og skriv inn den 6-sifrede koden som vises nå (den bytter hvert 30. sekund).";
    case "phone_code":
      return codeSent
        ? "Vi har sendt en kode på SMS. Skriv den inn her."
        : "Trykk «Send kode» for å få SMS.";
    case "email_code":
      return codeSent
        ? "Sjekk e-posten din (også søppelpost). Skriv inn koden fra Clerk."
        : "Trykk «Send kode» for å få e-post fra Clerk.";
    case "backup_code":
      return "Skriv inn en av backup-kodene du fikk da du satte opp 2FA i Clerk.";
    default:
      return "Skriv inn verifiseringskoden.";
  }
}

export function SignInScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
  const [pendingFirstFactor, setPendingFirstFactor] = useState(false);
  const [supportedFactors, setSupportedFactors] = useState<SecondFactor[]>([]);
  const [supportedFirstFactors, setSupportedFirstFactors] = useState<FirstFactor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<SecondFactor | null>(null);
  const [selectedFirstFactor, setSelectedFirstFactor] = useState<FirstFactor | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeInputKey, setCodeInputKey] = useState(0);

  const strategy = selectedFactor?.strategy ?? "totp";

  const goToApp = useCallback(() => {
    router.replace("/(tabs)/brief");
  }, [router]);

  const finishSignIn = useCallback(
    async (sessionId: string) => {
      if (!setActive) return false;
      const active = await activateClerkSession(setActive, sessionId);
      if (!active) {
        setErrorMessage("Innloggingen fullførte, men økten startet ikke. Prøv igjen.");
        return false;
      }
      goToApp();
      return true;
    },
    [setActive, goToApp],
  );

  useEffect(() => {
    if (auth.isLoaded && auth.isSignedIn) {
      goToApp();
    }
  }, [auth.isLoaded, auth.isSignedIn, goToApp]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: codeInputKey and strategy are intentional reset triggers
  useEffect(() => {
    if (pendingSecondFactor || pendingFirstFactor) {
      const timer = setTimeout(() => codeRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingSecondFactor, pendingFirstFactor, codeInputKey, strategy]);

  function focusCodeField() {
    Keyboard.dismiss();
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  function resetVerificationFlow() {
    setPendingSecondFactor(false);
    setPendingFirstFactor(false);
    setSupportedFactors([]);
    setSupportedFirstFactors([]);
    setSelectedFactor(null);
    setSelectedFirstFactor(null);
    setVerificationCode("");
    setCodeSent(false);
    setErrorMessage(null);
    setCodeInputKey((k) => k + 1);
  }

  async function prepareFirstFactorDelivery(factor: FirstFactor) {
    if (!signIn) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await (
        signIn as unknown as {
          prepareFirstFactor: (input: {
            strategy: string;
            emailAddressId?: string;
            phoneNumberId?: string;
          }) => Promise<unknown>;
        }
      ).prepareFirstFactor({
        strategy: factor.strategy,
        emailAddressId: "emailAddressId" in factor ? factor.emailAddressId : undefined,
        phoneNumberId: "phoneNumberId" in factor ? factor.phoneNumberId : undefined,
      });
      setCodeSent(true);
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, "Kunne ikke sende kode. Prøv igjen."));
    } finally {
      setSubmitting(false);
    }
  }

  async function selectFirstFactor(factor: FirstFactor) {
    setSelectedFirstFactor(factor);
    setVerificationCode("");
    setCodeSent(false);
    setErrorMessage(null);
    setCodeInputKey((k) => k + 1);
    if (factor.strategy === "email_code" || factor.strategy === "phone_code") {
      await prepareFirstFactorDelivery(factor);
      return;
    }
    setCodeSent(true);
  }

  function beginFirstFactorStep(signInResource: SignInResource) {
    const factors = signInResource.supportedFirstFactors ?? [];
    setSupportedFirstFactors(factors);
    setPendingFirstFactor(true);
    setPendingSecondFactor(false);
    setVerificationCode("");
    setErrorMessage(null);
    setCodeInputKey((k) => k + 1);

    const preferred =
      factors.find((f) => f.strategy === "email_code") ??
      factors.find((f) => f.strategy === "phone_code") ??
      factors[0];

    if (preferred) {
      void selectFirstFactor(preferred);
    }
  }

  async function prepareCodeDelivery(factor: SecondFactor) {
    if (!signIn) return;
    const needsPrepare = factor.strategy === "email_code" || factor.strategy === "phone_code";
    if (!needsPrepare) {
      setCodeSent(true);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await (
        signIn as unknown as {
          prepareSecondFactor: (input: {
            strategy: string;
            phoneNumberId?: string;
            emailAddressId?: string;
          }) => Promise<unknown>;
        }
      ).prepareSecondFactor({
        strategy: factor.strategy,
        phoneNumberId: "phoneNumberId" in factor ? factor.phoneNumberId : undefined,
        emailAddressId: "emailAddressId" in factor ? factor.emailAddressId : undefined,
      });
      setCodeSent(true);
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, "Kunne ikke sende kode. Prøv igjen."));
    } finally {
      setSubmitting(false);
    }
  }

  async function selectFactor(factor: SecondFactor) {
    setSelectedFactor(factor);
    setVerificationCode("");
    setCodeSent(false);
    setErrorMessage(null);
    setCodeInputKey((k) => k + 1);

    if (factor.strategy === "totp" || factor.strategy === "backup_code") {
      setCodeSent(true);
      return;
    }
    await prepareCodeDelivery(factor);
  }

  function beginSecondFactorStep(signInResource: SignInResource) {
    const factors = signInResource.supportedSecondFactors ?? [];
    console.log("Clerk supportedSecondFactors:", JSON.stringify(factors));
    setSupportedFactors(factors);
    setPendingSecondFactor(true);
    setVerificationCode("");
    setErrorMessage(null);
    setCodeInputKey((k) => k + 1);

    const preferred =
      factors.find((f) => f.strategy === "email_code") ??
      factors.find((f) => f.strategy === "phone_code") ??
      factors.find((f) => f.strategy === "totp") ??
      factors[0];

    if (preferred) {
      void selectFactor(preferred);
    }
  }

  async function onSignInPress() {
    if (!isLoaded || !signIn || !setActive) return;
    if (auth.isSignedIn) {
      goToApp();
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    setErrorMessage(null);
    resetVerificationFlow();
    try {
      const attempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      const step = resolveSignInStep(attempt as SignInResource);
      if (step.kind === "complete") {
        const ok = await finishSignIn(step.sessionId);
        if (ok) setErrorMessage(null);
      } else if (step.kind === "second_factor") {
        beginSecondFactorStep(step.signIn);
      } else if (step.kind === "first_factor") {
        beginFirstFactorStep(step.signIn);
      } else {
        setErrorMessage(signInStatusMessage(step.status));
      }
    } catch (error: unknown) {
      if (isSessionExistsError(error)) {
        await clearClerkAuthStorage();
        if (auth.isSignedIn) {
          goToApp();
          return;
        }
        try {
          const retry = await signIn.create({
            identifier: emailAddress.trim(),
            password,
          });
          const retryStep = resolveSignInStep(retry as SignInResource);
          if (retryStep.kind === "complete") {
            await finishSignIn(retryStep.sessionId);
            return;
          }
        } catch {
          // fall through to user-visible error
        }
      }
      if (auth.isSignedIn) {
        goToApp();
        return;
      }
      setErrorMessage(clerkErrorMessage(error, "Kunne ikke logge inn. Sjekk e-post og passord."));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifySecondFactorPress() {
    if (!isLoaded || !signIn || !setActive || !selectedFactor) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const params: { strategy: string; code: string; phoneNumberId?: string } = {
        strategy: selectedFactor.strategy,
        code: verificationCode.trim(),
      };
      if (selectedFactor.strategy === "phone_code" && "phoneNumberId" in selectedFactor) {
        params.phoneNumberId = selectedFactor.phoneNumberId;
      }

      const result = await (
        signIn as unknown as {
          attemptSecondFactor: (input: {
            strategy: string;
            code: string;
            phoneNumberId?: string;
          }) => Promise<{ status: string; createdSessionId?: string }>;
        }
      ).attemptSecondFactor(params);

      if (result.status === "complete" && result.createdSessionId) {
        await finishSignIn(result.createdSessionId);
      } else {
        const step = resolveSignInStep(signIn);
        if (step.kind === "complete") {
          await finishSignIn(step.sessionId);
        } else {
          setErrorMessage("Verifisering fullførte ikke. Prøv en ny kode eller start på nytt.");
          setVerificationCode("");
          setCodeInputKey((k) => k + 1);
          focusCodeField();
        }
      }
    } catch (error: unknown) {
      console.error("2FA verification failed", selectedFactor.strategy, error);
      if (isSessionExistsError(error) || auth.isSignedIn) {
        goToApp();
        return;
      }
      const clerkMsg = clerkErrorMessage(error, "");
      if (selectedFactor.strategy === "totp" && clerkMsg.toLowerCase().includes("incorrect")) {
        setErrorMessage(
          "Feil kode fra autentiseringsappen. Bruk koden som vises NÅ (ny hvert 30. sek), riktig app-konto, og samme Clerk-miljø (dev vs prod) som i .env. Etter flere feil: «Start innlogging på nytt».",
        );
      } else {
        setErrorMessage(clerkMsg || "Ugyldig kode. Prøv igjen.");
      }
      setVerificationCode("");
      setCodeInputKey((k) => k + 1);
      focusCodeField();
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyFirstFactorPress() {
    if (!isLoaded || !signIn || !setActive || !selectedFirstFactor) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const params: {
        strategy: string;
        code: string;
        emailAddressId?: string;
        phoneNumberId?: string;
      } = {
        strategy: selectedFirstFactor.strategy,
        code: verificationCode.trim(),
      };
      if (
        selectedFirstFactor.strategy === "email_code" &&
        "emailAddressId" in selectedFirstFactor
      ) {
        params.emailAddressId = selectedFirstFactor.emailAddressId;
      }
      if (selectedFirstFactor.strategy === "phone_code" && "phoneNumberId" in selectedFirstFactor) {
        params.phoneNumberId = selectedFirstFactor.phoneNumberId;
      }

      await (
        signIn as unknown as {
          attemptFirstFactor: (input: typeof params) => Promise<unknown>;
        }
      ).attemptFirstFactor(params);

      const step = resolveSignInStep(signIn);
      if (step.kind === "complete") {
        await finishSignIn(step.sessionId);
      } else if (step.kind === "second_factor") {
        beginSecondFactorStep(step.signIn);
      } else if (step.kind === "unsupported") {
        setErrorMessage(signInStatusMessage(step.status));
      }
    } catch (error: unknown) {
      if (isSessionExistsError(error) || auth.isSignedIn) {
        goToApp();
        return;
      }
      setErrorMessage(clerkErrorMessage(error, "Ugyldig eller utløpt kode."));
      setVerificationCode("");
      setCodeInputKey((k) => k + 1);
      focusCodeField();
    } finally {
      setSubmitting(false);
    }
  }

  function onBackToCredentials() {
    resetVerificationFlow();
    setTimeout(() => emailRef.current?.focus(), 200);
  }

  const pendingVerification = pendingSecondFactor || pendingFirstFactor;
  const activeStrategy = pendingFirstFactor
    ? (selectedFirstFactor?.strategy ?? "email_code")
    : strategy;
  const minCodeLength = activeStrategy === "backup_code" ? 8 : 6;

  return (
    <View className="gap-5">
      {pendingVerification ? (
        <Text className="text-[16px] leading-[24px] text-text1 font-body mb-1">
          {pendingFirstFactor
            ? "Bekreft enheten — skriv inn koden du fikk på e-post (Client Trust)."
            : "Nesten ferdig — bekreft med ekstra sikkerhet."}
        </Text>
      ) : null}
      {!pendingVerification ? (
        <>
          <View>
            <Text className={authLabelClassName}>E-post</Text>
            <TextInput
              ref={emailRef}
              value={emailAddress}
              onChangeText={setEmailAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="deg@eksempel.no"
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          <View>
            <Text className={authLabelClassName}>Passord</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={onSignInPress}
              placeholder="Ditt passord"
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
        </>
      ) : (
        <>
          {pendingFirstFactor && supportedFirstFactors.length > 1 ? (
            <View className="gap-2">
              <Text className={authLabelClassName}>Verifiseringsmetode</Text>
              <View className="flex-row flex-wrap gap-2">
                {supportedFirstFactors.map((factor) => {
                  const active = selectedFirstFactor?.strategy === factor.strategy;
                  return (
                    <Pressable
                      key={`first-${factor.strategy}`}
                      onPress={() => selectFirstFactor(factor)}
                      className={`rounded-full px-4 py-2 border ${
                        active ? "bg-accent border-accent" : "bg-card border-bg2"
                      }`}
                    >
                      <Text
                        className={`text-[14px] font-bodyMedium ${
                          active ? "text-card" : "text-text1"
                        }`}
                      >
                        {strategyLabel(factor.strategy)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {supportedFactors.length > 1 ? (
            <View className="gap-2">
              <Text className={authLabelClassName}>Verifiseringsmetode</Text>
              <View className="flex-row flex-wrap gap-2">
                {supportedFactors.map((factor) => {
                  const active = selectedFactor?.strategy === factor.strategy;
                  return (
                    <Pressable
                      key={factor.strategy}
                      onPress={() => selectFactor(factor)}
                      className={`rounded-full px-4 py-2 border ${
                        active ? "bg-accent border-accent" : "bg-card border-bg2"
                      }`}
                    >
                      <Text
                        className={`text-[14px] font-bodyMedium ${
                          active ? "text-card" : "text-text1"
                        }`}
                      >
                        {strategyLabel(factor.strategy)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Text className="text-[16px] leading-[24px] text-text1 font-body">
            {strategyHint(activeStrategy, codeSent)}
          </Text>

          {(activeStrategy === "email_code" || activeStrategy === "phone_code") && !codeSent ? (
            <Pressable
              onPress={() => {
                if (pendingFirstFactor && selectedFirstFactor) {
                  void prepareFirstFactorDelivery(selectedFirstFactor);
                  return;
                }
                if (selectedFactor) void prepareCodeDelivery(selectedFactor);
              }}
              disabled={submitting}
              className="self-start rounded-xl bg-card2 px-4 py-3 border border-bg2"
            >
              <Text className="text-[15px] text-accent font-bodyMedium">Send kode</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={focusCodeField} accessibilityRole="button">
            <Text className={authLabelClassName}>
              {activeStrategy === "totp" ? "Kode fra autentiseringsapp" : "Verifiseringskode"}
            </Text>
            <TextInput
              key={`code-${codeInputKey}-${activeStrategy}`}
              ref={codeRef}
              value={verificationCode}
              onChangeText={(text) => {
                const maxLen = activeStrategy === "backup_code" ? 12 : 8;
                setVerificationCode(
                  activeStrategy === "backup_code"
                    ? text.replace(/\s/g, "").slice(0, maxLen)
                    : text.replace(/\D/g, "").slice(0, maxLen),
                );
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              keyboardType={activeStrategy === "backup_code" ? "default" : "number-pad"}
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={
                pendingFirstFactor ? onVerifyFirstFactorPress : onVerifySecondFactorPress
              }
              placeholder={activeStrategy === "backup_code" ? "backup-xxxx" : "000000"}
              placeholderTextColor={authPlaceholderColor}
              className={authCodeInputClassName}
              style={authCodeInputStyle}
              editable={!submitting && codeSent}
              selectTextOnFocus
            />
            <Text className="text-[14px] text-text3 font-body mt-2">
              Trykk her hvis tastaturet ikke vises.
            </Text>
          </Pressable>

          <Pressable onPress={onBackToCredentials} className="self-start py-2">
            <Text className="text-[15px] text-accent font-bodyMedium">
              ← Start innlogging på nytt
            </Text>
          </Pressable>
        </>
      )}

      {errorMessage ? (
        <View className="rounded-xl bg-redLight px-4 py-3">
          <Text className="text-[15px] leading-[22px] text-red font-body">{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={
          pendingFirstFactor
            ? onVerifyFirstFactorPress
            : pendingSecondFactor
              ? onVerifySecondFactorPress
              : onSignInPress
        }
        disabled={
          !isLoaded ||
          submitting ||
          (!pendingVerification && (!emailAddress.trim() || !password)) ||
          (pendingVerification &&
            (pendingFirstFactor
              ? !codeSent || !selectedFirstFactor || verificationCode.length < minCodeLength
              : !codeSent || !selectedFactor || verificationCode.length < minCodeLength))
        }
        className="min-h-[56px] rounded-2xl bg-accent px-5 py-4 justify-center disabled:opacity-50"
      >
        {submitting ? (
          <ActivityIndicator color="#F7F4EF" />
        ) : (
          <Text className="text-center text-[17px] text-card font-bodySemi">
            {pendingVerification ? "Bekreft og fortsett" : "Logg inn"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
