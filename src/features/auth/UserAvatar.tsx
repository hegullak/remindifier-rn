import type { UserResource } from "@clerk/types";
import { Image } from "expo-image";
import { Text, View } from "react-native";

function initialsForUser(user: UserResource | null | undefined) {
  const first = user?.firstName?.trim();
  const last = user?.lastName?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function UserAvatar({
  user,
  size = 34,
}: {
  user: UserResource | null | undefined;
  size?: number;
}) {
  const initials = initialsForUser(user);
  const imageUrl = user?.hasImage ? user.imageUrl : undefined;
  const fontSize = size < 40 ? 13 : 20;

  if (imageUrl) {
    return (
      <View
        className="rounded-full overflow-hidden border border-border bg-card2"
        style={{ width: size, height: size }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel="Profile photo"
        />
      </View>
    );
  }

  return (
    <View
      className="rounded-full items-center justify-center border border-border bg-card2"
      style={{ width: size, height: size }}
    >
      <Text className="text-accent font-bodySemi" style={{ fontSize }}>
        {initials}
      </Text>
    </View>
  );
}
