import { useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  authInputClassName,
  authLabelClassName,
  authPlaceholderColor,
} from "@/features/auth/authStyles";
import { clearClerkAuthStorage } from "@/features/auth/clerk/clearAuthStorage";
import { clerkErrorMessage } from "@/features/auth/clerk/errors";
import { UserAvatar } from "@/features/auth/UserAvatar";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";

type SheetView = "menu" | "password";

export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SheetView>("menu");
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

  function openSheet() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setView("menu");
    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
    setView("menu");
    setErrorMessage(null);
    setSuccessMessage(null);
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
      setSuccessMessage("Profil oppdatert.");
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, "Kunne ikke lagre profil."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setErrorMessage("Nytt passord og bekreftelse er ikke like.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Nytt passord må være minst 8 tegn.");
      return;
    }
    setSavingPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setSuccessMessage("Passord oppdatert.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setView("menu");
    } catch (error: unknown) {
      setErrorMessage(clerkErrorMessage(error, "Kunne ikke endre passord."));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      closeSheet();
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

  return (
    <>
      <Pressable
        onPress={openSheet}
        hitSlop={6}
        accessibilityLabel="Konto og innlogging"
        className="w-[34px] h-[34px] rounded-md items-center justify-center opacity-95 active:opacity-70"
      >
        <Text className="text-[20px] text-text2 font-body leading-[22px]">⋯</Text>
      </Pressable>

      <BottomSheet
        visible={open}
        onDismiss={closeSheet}
        title={view === "password" ? "Endre passord" : "Konto"}
      >
        {view === "menu" ? (
          <View className="gap-4">
            <View className="items-center gap-2 pb-2">
              <UserAvatar user={user} size={56} />
              {email ? <Text className="text-[13px] text-text3 font-body">{email}</Text> : null}
            </View>

            <View>
              <Text className={authLabelClassName}>Fornavn</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholder="Fornavn"
                placeholderTextColor={authPlaceholderColor}
                className={authInputClassName}
              />
            </View>
            <View>
              <Text className={authLabelClassName}>Etternavn</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholder="Etternavn"
                placeholderTextColor={authPlaceholderColor}
                className={authInputClassName}
              />
            </View>

            <Button
              variant="secondary"
              onPress={handleSaveProfile}
              loading={savingProfile}
              disabled={savingProfile || signingOut}
            >
              Lagre profil
            </Button>

            <Pressable
              onPress={() => {
                setView("password");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="py-2"
            >
              <Text className="text-[15px] text-accent font-bodyMedium">Endre passord</Text>
            </Pressable>

            {successMessage ? (
              <Text className="text-[14px] text-green font-body">{successMessage}</Text>
            ) : null}
            {errorMessage ? (
              <Text className="text-[14px] text-red font-body">{errorMessage}</Text>
            ) : null}

            <View className="border-t border-border pt-3 gap-2">
              <Button
                variant="ghost"
                onPress={handleSignOut}
                loading={signingOut}
                disabled={signingOut || savingProfile}
              >
                Logg ut
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-4">
            <View>
              <Text className={authLabelClassName}>Nåværende passord</Text>
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
              <Text className={authLabelClassName}>Nytt passord</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                textContentType="newPassword"
                placeholder="Minst 8 tegn"
                placeholderTextColor={authPlaceholderColor}
                className={authInputClassName}
              />
            </View>
            <View>
              <Text className={authLabelClassName}>Bekreft nytt passord</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="newPassword"
                placeholder="Gjenta passord"
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
              Oppdater passord
            </Button>
            <Button variant="ghost" onPress={() => setView("menu")} disabled={savingPassword}>
              ← Tilbake
            </Button>
          </View>
        )}
      </BottomSheet>
    </>
  );
}
