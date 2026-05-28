import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { UserAvatar } from "@/features/auth/UserAvatar";

export function ProfileHeaderLink() {
  const { user } = useUser();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/me")}
      accessibilityRole="button"
      accessibilityLabel="My profile"
      hitSlop={6}
      className="opacity-95 active:opacity-70"
    >
      <UserAvatar user={user} size={34} />
    </Pressable>
  );
}
