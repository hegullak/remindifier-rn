import { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import type { UpsertPersonInput } from "@/db/repos/peopleRepo";

interface PersonFormProps {
  initial?: {
    displayName: string;
    relationType: string | null;
    birthday: string | null;
    birthdayYearKnown: boolean;
    isSensitive: boolean;
    funFacts: string[];
  };
  submitLabel: string;
  onSubmit: (payload: UpsertPersonInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function PersonForm({ initial, submitLabel, onSubmit, onDelete }: PersonFormProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [relationType, setRelationType] = useState(initial?.relationType ?? "");
  const [birthday, setBirthday] = useState(initial?.birthday ?? "");
  const [birthdayYearKnown, setBirthdayYearKnown] = useState(initial?.birthdayYearKnown ?? true);
  const [isSensitive, setIsSensitive] = useState(initial?.isSensitive ?? false);
  const [funFactsText, setFunFactsText] = useState((initial?.funFacts ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const funFacts = funFactsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      await onSubmit({
        displayName,
        relationType: relationType.trim() || null,
        birthday: birthday.trim() || null,
        birthdayYearKnown,
        isSensitive,
        funFacts,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save person");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    setError(null);
    try {
      await onDelete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete person");
      setSaving(false);
    }
  };

  return (
    <View className="bg-card border border-black/10 rounded-lg px-4 py-4">
      <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">About</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Full name"
        placeholderTextColor="#A89E90"
        className="mt-2 bg-bg2 border border-black/10 rounded-md px-3 py-3 text-[14px] text-text1 font-body"
      />

      <TextInput
        value={relationType}
        onChangeText={setRelationType}
        placeholder="Relation type"
        placeholderTextColor="#A89E90"
        className="mt-2 bg-bg2 border border-black/10 rounded-md px-3 py-3 text-[14px] text-text1 font-body"
      />

      <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-4">
        Birthday
      </Text>
      <TextInput
        value={birthday}
        onChangeText={setBirthday}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#A89E90"
        className="mt-2 bg-bg2 border border-black/10 rounded-md px-3 py-3 text-[14px] text-text1 font-body"
      />
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-[12px] text-text2 font-body">Year is known</Text>
        <Switch value={birthdayYearKnown} onValueChange={setBirthdayYearKnown} />
      </View>

      <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-4">
        Fun facts
      </Text>
      <TextInput
        value={funFactsText}
        onChangeText={setFunFactsText}
        placeholder={"One per line\nRan her 6th half marathon in May this year."}
        placeholderTextColor="#A89E90"
        multiline
        numberOfLines={5}
        className="mt-2 bg-bg2 border border-black/10 rounded-md px-3 py-3 text-[14px] text-text1 font-body"
        style={{ textAlignVertical: "top", minHeight: 110 }}
      />

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-[12px] text-text2 font-body">Handle with care</Text>
        <Switch value={isSensitive} onValueChange={setIsSensitive} />
      </View>

      {error ? <Text className="text-[12px] text-red font-body mt-3">{error}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        className="mt-4 bg-text1 rounded-lg py-3 px-4 items-center"
      >
        <Text className="text-[14px] text-card font-bodySemi">{saving ? "Saving..." : submitLabel}</Text>
      </Pressable>

      {onDelete ? (
        <Pressable
          onPress={handleDelete}
          disabled={saving}
          className="mt-2 border border-red/40 rounded-lg py-3 px-4 items-center"
        >
          <Text className="text-[13px] text-red font-bodyMedium">Delete person</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
