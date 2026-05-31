export type RemindifierQrPayload = {
  remindifier: 1;
  name: string;
  birthday?: string;
  birthdayYearKnown?: boolean;
  about?: string;
  contact?: string;
};

export function buildRemindifierQrPayload(profile: {
  displayName: string;
  birthday: string | null;
  birthdayYearKnown: boolean | null;
  about: string | null;
  contactPreference: string | null;
}): RemindifierQrPayload {
  const payload: RemindifierQrPayload = {
    remindifier: 1,
    name: profile.displayName,
    birthdayYearKnown: profile.birthdayYearKnown ?? false,
  };
  if (profile.birthday) payload.birthday = profile.birthday;
  if (profile.about?.trim()) payload.about = profile.about.trim();
  if (profile.contactPreference?.trim()) payload.contact = profile.contactPreference.trim();
  return payload;
}

export function encodeRemindifierQrPayload(
  profile: Parameters<typeof buildRemindifierQrPayload>[0],
) {
  return JSON.stringify(buildRemindifierQrPayload(profile));
}

const QR_MAX_BYTES = 4096;
const QR_FIELD_LIMITS = { name: 200, about: 500, contact: 200 } as const;

export function parseRemindifierQrPayload(raw: string): RemindifierQrPayload | null {
  if (raw.length > QR_MAX_BYTES) return null;
  try {
    const data = JSON.parse(raw) as Partial<RemindifierQrPayload>;
    if (data.remindifier !== 1) return null;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) return null;
    return {
      remindifier: 1,
      name: data.name.trim().slice(0, QR_FIELD_LIMITS.name),
      birthday: typeof data.birthday === "string" ? data.birthday : undefined,
      birthdayYearKnown:
        typeof data.birthdayYearKnown === "boolean" ? data.birthdayYearKnown : undefined,
      about: typeof data.about === "string" ? data.about.slice(0, QR_FIELD_LIMITS.about) : undefined,
      contact: typeof data.contact === "string" ? data.contact.slice(0, QR_FIELD_LIMITS.contact) : undefined,
    };
  } catch {
    return null;
  }
}

export function qrPayloadToPersonPrefill(payload: RemindifierQrPayload) {
  const funFacts: string[] = [];
  if (payload.about?.trim()) funFacts.push(payload.about.trim());
  if (payload.contact?.trim()) {
    funFacts.push(`Preferred contact: ${payload.contact.trim()}`);
  }
  return {
    displayName: payload.name,
    relationType: payload.contact?.trim() ?? null,
    birthday: payload.birthday ?? null,
    birthdayYearKnown: payload.birthdayYearKnown ?? true,
    funFacts,
  };
}
