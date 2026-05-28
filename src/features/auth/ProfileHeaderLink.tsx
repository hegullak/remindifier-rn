import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { UserAvatar } from "@/features/auth/UserAvatar";
import { useTranslation } from "@/i18n";

export function ProfileHeaderLink() {
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => router.push("/settings")}
      accessibilityRole="button"
      accessibilityLabel={t("settings.title")}
      hitSlop={6}
      className="opacity-95 active:opacity-70"
    >
      <UserAvatar user={user} size={34} />
    </Pressable>
  );
}
