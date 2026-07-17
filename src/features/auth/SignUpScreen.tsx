import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import {
  authCodeInputClassName,
  authCodeInputStyle,
  authInputClassName,
  authLabelClassName,
  authPlaceholderColor,
} from "@/features/auth/authStyles";
import { clerkErrorMessage } from "@/features/auth/clerk/errors";
import { activateClerkSession } from "@/features/auth/clerk/session";
import { useTranslation } from "@/i18n/LanguageContext";

export function SignUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoaded, signUp, setActive } = useSignUp();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSignUpPress() {
    if (!isLoaded || !signUp || !setActive) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, t("signUpForm.createFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyPress() {
    if (!isLoaded || !signUp || !setActive) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });
      if (result.status === "complete" && result.createdSessionId) {
        const active = await activateClerkSession(setActive, result.createdSessionId);
        if (active) router.replace("/(tabs)/flow");
        else setErrorMessage(t("signUpForm.sessionNotStarted"));
      } else {
        setErrorMessage(t("signUpForm.verifyIncomplete"));
      }
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, t("signUpForm.invalidOrExpiredCode")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="gap-5">
      {!pendingVerification ? (
        <>
          <View>
            <Text className={authLabelClassName}>{t("signUpForm.email")}</Text>
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
              placeholder={t("signUpForm.emailPlaceholder")}
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          <View>
            <Text className={authLabelClassName}>{t("signUpForm.password")}</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={onSignUpPress}
              placeholder={t("signUpForm.passwordPlaceholder")}
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
        </>
      ) : (
        <>
          <Text className="text-base leading-[24px] text-text1 font-body">
            {t("signUpForm.codeSentTo", { email: emailAddress.trim() })}
          </Text>
          <View>
            <Text className={authLabelClassName}>{t("signUpForm.verificationCode")}</Text>
            <TextInput
              ref={codeRef}
              value={verificationCode}
              onChangeText={setVerificationCode}
              autoCapitalize="none"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={onVerifyPress}
              placeholder="000000"
              placeholderTextColor={authPlaceholderColor}
              className={authCodeInputClassName}
              style={authCodeInputStyle}
            />
          </View>
          <Pressable
            onPress={() => {
              setPendingVerification(false);
              setVerificationCode("");
              setErrorMessage(null);
            }}
            className="self-start py-2"
          >
            <Text className="text-body-lg text-accent font-bodyMedium">
              {t("signUpForm.changeEmail")}
            </Text>
          </Pressable>
        </>
      )}

      {errorMessage ? (
        <View className="rounded-xl bg-redLight px-4 py-3">
          <Text className="text-body-lg leading-[22px] text-red font-body">{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={pendingVerification ? onVerifyPress : onSignUpPress}
        disabled={
          !isLoaded ||
          submitting ||
          (!pendingVerification && (!emailAddress.trim() || password.length < 8)) ||
          (pendingVerification && verificationCode.trim().length < 6)
        }
        className="min-h-[56px] rounded-2xl bg-accent px-5 py-4 justify-center disabled:opacity-50"
      >
        {submitting ? (
          <ActivityIndicator color="#F7F4EF" />
        ) : (
          <Text className="text-center text-[17px] text-card font-bodySemi">
            {pendingVerification ? t("signUpForm.confirmEmail") : t("signUpForm.createAccount")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
