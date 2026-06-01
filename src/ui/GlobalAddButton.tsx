import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import { triggerLight } from "@/lib/haptics";
import { BottomSheet } from "@/ui/BottomSheet";

export type AddMenuAction = {
  icon: string;
  bgClass: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export type AddMenuSection = {
  title?: string;
  actions: AddMenuAction[];
};

type Props = {
  /** One or more sections shown above global actions. */
  prependSections?: AddMenuSection[];
  /** @deprecated Use prependSections */
  prependSectionTitle?: string;
  /** @deprecated Use prependSections */
  prependActions?: AddMenuAction[];
};

function toSections(props: Props): AddMenuSection[] {
  if (props.prependSections && props.prependSections.length > 0) {
    return props.prependSections;
  }
  if (props.prependActions && props.prependActions.length > 0) {
    return [{ title: props.prependSectionTitle, actions: props.prependActions }];
  }
  return [];
}

export function GlobalAddButton(props: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const prependSections = toSections(props);

  const globalActions: AddMenuAction[] = [
    {
      icon: "🎙️",
      bgClass: "bg-sageLight",
      label: t("global.quickCapture"),
      onPress: () => {
        router.push("/intake");
      },
    },
    {
      icon: "👤",
      bgClass: "bg-green-light",
      label: t("global.newPerson"),
      onPress: () => {
        router.push("/people/new");
      },
    },
    {
      icon: "🌿",
      bgClass: "bg-accent-light",
      label: t("global.newEvent"),
      onPress: () => {
        router.push("/gather/new");
      },
    },
  ];

  function renderAction(action: AddMenuAction) {
    return (
      <Pressable
        key={action.label}
        onPress={() => {
          triggerLight();
          setOpen(false);
          action.onPress();
        }}
        className="flex-row items-center gap-4 py-2"
      >
        <View className={`w-11 h-11 rounded-xl ${action.bgClass} items-center justify-center`}>
          <Text className="text-nav">{action.icon}</Text>
        </View>
        <Text
          className={`text-base font-bodyMedium ${action.destructive ? "text-red" : "text-text1"}`}
        >
          {action.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => {
          triggerLight();
          setOpen(true);
        }}
        hitSlop={10}
        className="w-9 h-9 rounded-full bg-accent items-center justify-center"
        accessibilityLabel="New"
      >
        <Text className="text-xl text-card font-body leading-[22px]">+</Text>
      </Pressable>

      <BottomSheet visible={open} onDismiss={() => setOpen(false)} title={t("global.addTitle")}>
        <View className="gap-2 pt-1">
          {prependSections.map((section, index) => (
            <View key={section.title ?? `section-${index}`}>
              {section.title ? (
                <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi px-1 pb-1">
                  {section.title}
                </Text>
              ) : null}
              {section.actions.map(renderAction)}
              <View className="h-px bg-border my-2" />
            </View>
          ))}
          {globalActions.map(renderAction)}
        </View>
      </BottomSheet>
    </>
  );
}
