import { useSignIn } from "@clerk/clerk-expo";
import type { SignInResource } from "@clerk/types";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SecondFactor = NonNullable<SignInResource["supportedSecondFactors"]>[number];

function clerkErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "errors" in error) {
    const first = (error as { errors?: Array<{ message?: string }> }).errors?.[0]?.message;
    if (first) return first;
  }
  const asString = String(error);
  if (asString.includes("account is locked") || asString.includes("locked")) {
    return "Kontoen er midlertidig låst etter for mange feil forsøk. Vent litt, eller lås opp brukeren i Clerk Dashboard → Users.";
  }
  return fallback;
}

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

const inputClassName =
  "min-h-[56px] rounded-2xl border border-bg2 bg-card px-5 text-[18px] leading-[24px] text-text1 font-body";
const labelClassName = "text-[15px] text-text2 font-bodyMedium mb-2";

export function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
  const [supportedFactors, setSupportedFactors] = useState<SecondFactor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<SecondFactor | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeInputKey, setCodeInputKey] = useState(0);

  const strategy = selectedFactor?.strategy ?? "totp";

  // biome-ignore lint/correctness/useExhaustiveDependencies: codeInputKey and strategy are intentional reset triggers
  useEffect(() => {
    if (pendingSecondFactor) {
      const timer = setTimeout(() => codeRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingSecondFactor, codeInputKey, strategy]);

  function focusCodeField() {
    Keyboard.dismiss();
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  function resetSecondFactorFlow() {
    setPendingSecondFactor(false);
    setSupportedFactors([]);
    setSelectedFactor(null);
    setVerificationCode("");
    setCodeSent(false);
    setErrorMessage(null);
    setCodeInputKey((k) => k + 1);
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
    Keyboard.dismiss();
    setSubmitting(true);
    setErrorMessage(null);
    resetSecondFactorFlow();
    try {
      const attempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      const signInState = signIn.status ? signIn : attempt;
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
      } else if (
        attempt.status === "needs_second_factor" ||
        signIn.status === "needs_second_factor"
      ) {
        beginSecondFactorStep(signInState as SignInResource);
      } else {
        setErrorMessage("Innlogging krever et ekstra steg i Clerk som ikke er støttet her ennå.");
      }
    } catch (error: unknown) {
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
        await setActive({ session: result.createdSessionId });
      } else {
        setErrorMessage("Verifisering fullførte ikke. Prøv en ny kode eller start på nytt.");
        setVerificationCode("");
        setCodeInputKey((k) => k + 1);
        focusCodeField();
      }
    } catch (error: unknown) {
      console.error("2FA verification failed", selectedFactor.strategy, error);
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

  function onBackToCredentials() {
    resetSecondFactorFlow();
    setTimeout(() => emailRef.current?.focus(), 200);
  }

  const minCodeLength = strategy === "backup_code" ? 8 : 6;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-6 pt-10 pb-10"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text className="text-[34px] leading-[40px] text-text1 font-heading">remindifier</Text>
          <Text className="text-[17px] leading-[24px] text-text2 font-body mt-4 max-w-[340px]">
            {pendingSecondFactor
              ? "Nesten ferdig — bekreft med ekstra sikkerhet."
              : "Logg inn for å låse opp ditt lokale, krypterte minne på denne enheten."}
          </Text>

          <View className="mt-10 gap-5">
            {!pendingSecondFactor ? (
              <>
                <View>
                  <Text className={labelClassName}>E-post</Text>
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
                    placeholderTextColor="#A89E90"
                    className={inputClassName}
                  />
                </View>
                <View>
                  <Text className={labelClassName}>Passord</Text>
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={onSignInPress}
                    placeholder="Ditt passord"
                    placeholderTextColor="#A89E90"
                    className={inputClassName}
                  />
                </View>
              </>
            ) : (
              <>
                {supportedFactors.length > 1 ? (
                  <View className="gap-2">
                    <Text className={labelClassName}>Verifiseringsmetode</Text>
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
                  {strategyHint(strategy, codeSent)}
                </Text>

                {(strategy === "email_code" || strategy === "phone_code") && !codeSent ? (
                  <Pressable
                    onPress={() => selectedFactor && prepareCodeDelivery(selectedFactor)}
                    disabled={submitting}
                    className="self-start rounded-xl bg-card2 px-4 py-3 border border-bg2"
                  >
                    <Text className="text-[15px] text-accent font-bodyMedium">Send kode</Text>
                  </Pressable>
                ) : null}

                <Pressable onPress={focusCodeField} accessibilityRole="button">
                  <Text className={labelClassName}>
                    {strategy === "totp" ? "Kode fra autentiseringsapp" : "Verifiseringskode"}
                  </Text>
                  <TextInput
                    key={`code-${codeInputKey}-${strategy}`}
                    ref={codeRef}
                    value={verificationCode}
                    onChangeText={(text) => {
                      const maxLen = strategy === "backup_code" ? 12 : 8;
                      setVerificationCode(
                        strategy === "backup_code"
                          ? text.replace(/\s/g, "").slice(0, maxLen)
                          : text.replace(/\D/g, "").slice(0, maxLen),
                      );
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    keyboardType={strategy === "backup_code" ? "default" : "number-pad"}
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={onVerifySecondFactorPress}
                    placeholder={strategy === "backup_code" ? "backup-xxxx" : "000000"}
                    placeholderTextColor="#A89E90"
                    className={`${inputClassName} text-center text-[28px] tracking-[6px] font-bodySemi`}
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
                <Text className="text-[15px] leading-[22px] text-red font-body">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={pendingSecondFactor ? onVerifySecondFactorPress : onSignInPress}
              disabled={
                !isLoaded ||
                submitting ||
                (!pendingSecondFactor && (!emailAddress.trim() || !password)) ||
                (pendingSecondFactor &&
                  (!codeSent || !selectedFactor || verificationCode.length < minCodeLength))
              }
              className="min-h-[56px] rounded-2xl bg-accent px-5 py-4 justify-center disabled:opacity-50"
            >
              {submitting ? (
                <ActivityIndicator color="#F7F4EF" />
              ) : (
                <Text className="text-center text-[17px] text-card font-bodySemi">
                  {pendingSecondFactor ? "Bekreft og fortsett" : "Logg inn"}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
