import {
  buildRemindifierQrPayload,
  encodeRemindifierQrPayload,
  parseRemindifierQrPayload,
  qrPayloadToPersonPrefill,
} from "@/lib/me/qr-payload";

const FULL_PROFILE = {
  displayName: "Henning Gullaksen",
  birthday: "1985-03-15",
  birthdayYearKnown: true,
  about: "Collects vinyl records.",
  contactPreference: "SMS",
};

describe("buildRemindifierQrPayload", () => {
  it("always sets remindifier version 1", () => {
    expect(buildRemindifierQrPayload(FULL_PROFILE).remindifier).toBe(1);
  });

  it("includes display name as name", () => {
    expect(buildRemindifierQrPayload(FULL_PROFILE).name).toBe("Henning Gullaksen");
  });

  it("includes birthday when set", () => {
    expect(buildRemindifierQrPayload(FULL_PROFILE).birthday).toBe("1985-03-15");
  });

  it("omits birthday when null", () => {
    const result = buildRemindifierQrPayload({ ...FULL_PROFILE, birthday: null });
    expect(result.birthday).toBeUndefined();
  });

  it("omits about when null", () => {
    const result = buildRemindifierQrPayload({ ...FULL_PROFILE, about: null });
    expect(result.about).toBeUndefined();
  });

  it("omits about when blank string", () => {
    const result = buildRemindifierQrPayload({ ...FULL_PROFILE, about: "   " });
    expect(result.about).toBeUndefined();
  });

  it("omits contact when null", () => {
    const result = buildRemindifierQrPayload({ ...FULL_PROFILE, contactPreference: null });
    expect(result.contact).toBeUndefined();
  });

  it("trims whitespace from about", () => {
    const result = buildRemindifierQrPayload({ ...FULL_PROFILE, about: "  vinyl  " });
    expect(result.about).toBe("vinyl");
  });
});

describe("parseRemindifierQrPayload", () => {
  it("parses a valid payload", () => {
    const json = JSON.stringify({ remindifier: 1, name: "Ida Nilsen" });
    const result = parseRemindifierQrPayload(json);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Ida Nilsen");
  });

  it("returns null for wrong remindifier version", () => {
    const json = JSON.stringify({ remindifier: 2, name: "Ida" });
    expect(parseRemindifierQrPayload(json)).toBeNull();
  });

  it("returns null when name is missing", () => {
    const json = JSON.stringify({ remindifier: 1 });
    expect(parseRemindifierQrPayload(json)).toBeNull();
  });

  it("returns null when name is empty string", () => {
    const json = JSON.stringify({ remindifier: 1, name: "" });
    expect(parseRemindifierQrPayload(json)).toBeNull();
  });

  it("returns null when name is whitespace only", () => {
    const json = JSON.stringify({ remindifier: 1, name: "   " });
    expect(parseRemindifierQrPayload(json)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseRemindifierQrPayload("not-json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRemindifierQrPayload("")).toBeNull();
  });

  it("ignores non-string fields gracefully", () => {
    const json = JSON.stringify({ remindifier: 1, name: "Ida", birthday: 12345 });
    const result = parseRemindifierQrPayload(json);
    expect(result).not.toBeNull();
    expect(result!.birthday).toBeUndefined();
  });

  it("preserves optional fields when present", () => {
    const json = JSON.stringify({
      remindifier: 1,
      name: "Ida",
      birthday: "1990-06-15",
      birthdayYearKnown: true,
      about: "Trains on Thursdays",
      contact: "SMS",
    });
    const result = parseRemindifierQrPayload(json);
    expect(result!.birthday).toBe("1990-06-15");
    expect(result!.birthdayYearKnown).toBe(true);
    expect(result!.about).toBe("Trains on Thursdays");
    expect(result!.contact).toBe("SMS");
  });
});

describe("encode / parse round-trip", () => {
  it("survives a full round-trip", () => {
    const encoded = encodeRemindifierQrPayload(FULL_PROFILE);
    const parsed = parseRemindifierQrPayload(encoded);
    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe(FULL_PROFILE.displayName);
    expect(parsed!.birthday).toBe(FULL_PROFILE.birthday);
    expect(parsed!.about).toBe(FULL_PROFILE.about);
    expect(parsed!.contact).toBe(FULL_PROFILE.contactPreference);
  });
});

describe("qrPayloadToPersonPrefill", () => {
  it("maps name to displayName", () => {
    const result = qrPayloadToPersonPrefill({ remindifier: 1, name: "Jonas Vik" });
    expect(result.displayName).toBe("Jonas Vik");
  });

  it("maps birthday through", () => {
    const result = qrPayloadToPersonPrefill({
      remindifier: 1,
      name: "Jonas",
      birthday: "1978-01-18",
      birthdayYearKnown: true,
    });
    expect(result.birthday).toBe("1978-01-18");
    expect(result.birthdayYearKnown).toBe(true);
  });

  it("returns null birthday when not in payload", () => {
    const result = qrPayloadToPersonPrefill({ remindifier: 1, name: "Jonas" });
    expect(result.birthday).toBeNull();
  });

  it("includes about in funFacts when present", () => {
    const result = qrPayloadToPersonPrefill({
      remindifier: 1,
      name: "Jonas",
      about: "Collects vinyl",
    });
    expect(result.funFacts).toContain("Collects vinyl");
  });
});
