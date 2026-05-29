import { useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import {
  authInputClassName,
  authLabelClassName,
  authPlaceholderColor,
} from "@/features/auth/authStyles";
import { clearClerkAuthStorage } from "@/features/auth/clerk/clearAuthStorage";
import { clerkErrorMessage } from "@/features/auth/clerk/errors";
import { useTranslation } from "@/i18n";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";

function displayNameFromUser(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function AccountSettingsSection() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "";

  const displayName = displayNameFromUser(user?.firstName, user?.lastName);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.firstName, user?.lastName]);

  function openEditSheet() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditOpen(true);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await user.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      setSuccessMessage(t("auth.nameUpdated"));
      setEditOpen(false);
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, t("auth.saveProfileFailed")));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setErrorMessage(t("auth.passwordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(t("auth.passwordMinLength"));
      return;
    }
    setSavingPassword(true);
    setErrorMessage(null);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      setSuccessMessage(t("auth.passwordUpdated"));
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, t("auth.passwordChangeFailed")));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      try {
        await signOut();
      } catch {
        // Clerk may reject if session already ended — still clear local tokens.
      }
      await clearClerkAuthStorage();
      router.replace("/sign-in");
    } finally {
      setSigningOut(false);
    }
  }

  function openPasswordSheet() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setPasswordOpen(true);
  }

  return (
    <>
      <Card>
        <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
          {t("settings.signIn")}
        </Text>
        <Text className="text-[13px] text-text2 font-body mt-2 leading-[19px]">
          {t("settings.signInClerkLeadBefore")}
          <Text
            className="text-accent font-bodyMedium"
            onPress={() => void Linking.openURL("https://clerk.com")}
            accessibilityRole="link"
          >
            {t("settings.signInClerkLink")}
          </Text>
          {t("settings.signInClerkLeadAfter")}
        </Text>

        <View className="mt-4 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[16px] text-text1 font-bodyMedium">
              {displayName ?? t("settings.noName")}
            </Text>
            {email ? <Text className="text-[13px] text-text3 font-body mt-1">{email}</Text> : null}
          </View>
          <Pressable onPress={openEditSheet} className="py-1 px-1">
            <Text className="text-[13px] text-accent font-bodyMedium">{t("common.edit")}</Text>
          </Pressable>
        </View>

        <View className="mt-4 gap-1 border-t border-border pt-3">
          <Pressable onPress={openPasswordSheet} className="py-2">
            <Text className="text-[15px] text-accent font-bodyMedium">
              {t("settings.changePassword")}
            </Text>
          </Pressable>
          <Button
            variant="ghost"
            onPress={handleSignOut}
            loading={signingOut}
            disabled={signingOut}
          >
            {t("auth.signOut")}
          </Button>
        </View>

        {successMessage && !editOpen && !passwordOpen ? (
          <Text className="text-[14px] text-green font-body mt-2">{successMessage}</Text>
        ) : null}
      </Card>

      <BottomSheet
        visible={editOpen}
        onDismiss={() => setEditOpen(false)}
        title={t("settings.editNameTitle")}
      >
        <Text className="text-[13px] text-text3 font-body mb-4">{t("settings.editNameHint")}</Text>
        <View className="gap-4">
          <View>
            <Text className={authLabelClassName}>{t("settings.firstName")}</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              placeholder={t("settings.firstName")}
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          <View>
            <Text className={authLabelClassName}>{t("settings.lastName")}</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              placeholder={t("settings.lastName")}
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          {errorMessage ? (
            <Text className="text-[14px] text-red font-body">{errorMessage}</Text>
          ) : null}
          <Button
            variant="primary"
            onPress={handleSaveProfile}
            loading={savingProfile}
            disabled={savingProfile}
          >
            {t("common.save")}
          </Button>
          <Button variant="ghost" onPress={() => setEditOpen(false)} disabled={savingProfile}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={passwordOpen}
        onDismiss={() => setPasswordOpen(false)}
        title={t("settings.changePasswordTitle")}
      >
        <Text className="text-[13px] text-text3 font-body mb-4">
          {t("settings.changePasswordHint")}
        </Text>
        <View className="gap-4">
          <View>
            <Text className={authLabelClassName}>{t("settings.currentPassword")}</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              textContentType="password"
              placeholder="••••••••"
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          <View>
            <Text className={authLabelClassName}>{t("settings.newPassword")}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              textContentType="newPassword"
              placeholder={t("auth.passwordMinLength")}
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          <View>
            <Text className={authLabelClassName}>{t("settings.confirmPassword")}</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              placeholder={t("settings.confirmPassword")}
              placeholderTextColor={authPlaceholderColor}
              className={authInputClassName}
            />
          </View>
          {errorMessage ? (
            <Text className="text-[14px] text-red font-body">{errorMessage}</Text>
          ) : null}
          <Button
            variant="primary"
            onPress={handleChangePassword}
            loading={savingPassword}
            disabled={savingPassword || !currentPassword || !newPassword}
          >
            {t("common.save")}
          </Button>
          <Button variant="ghost" onPress={() => setPasswordOpen(false)} disabled={savingPassword}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>
    </>
  );
}
