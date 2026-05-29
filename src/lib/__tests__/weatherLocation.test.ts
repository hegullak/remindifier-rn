import * as Location from "expo-location";
import { PermissionStatus } from "expo-modules-core";
import { resolvePlaceName, resolveWeatherCoordinates } from "@/lib/brief/weatherLocation";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

function geocodedAddress(
  overrides: Partial<Location.LocationGeocodedAddress>,
): Location.LocationGeocodedAddress {
  return {
    formattedAddress: null,
    name: null,
    street: null,
    streetNumber: null,
    city: null,
    district: null,
    subregion: null,
    region: null,
    country: null,
    postalCode: null,
    isoCountryCode: null,
    timezone: null,
    ...overrides,
  };
}

describe("resolveWeatherCoordinates", () => {
  const envKeys = ["EXPO_PUBLIC_BRIEF_WEATHER_LAT", "EXPO_PUBLIC_BRIEF_WEATHER_LON"] as const;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    jest.resetAllMocks();
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("returns device coordinates when permission is granted", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 59.91,
        longitude: 10.75,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 0,
    });

    const result = await resolveWeatherCoordinates();
    expect(result).toEqual({ lat: 59.91, lon: 10.75, source: "device" });
  });

  it("uses configured env coordinates when GPS is denied", async () => {
    process.env.EXPO_PUBLIC_BRIEF_WEATHER_LAT = "60.1";
    process.env.EXPO_PUBLIC_BRIEF_WEATHER_LON = "5.2";
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });

    const result = await resolveWeatherCoordinates();
    expect(result).toEqual({ lat: 60.1, lon: 5.2, source: "configured" });
  });

  it("falls back to default Hagavik coordinates", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockRejectedValue(new Error("no gps"));

    const result = await resolveWeatherCoordinates();
    expect(result).toEqual({ lat: 60.267, lon: 5.377, source: "configured" });
  });

  it("ignores invalid configured coordinates", async () => {
    process.env.EXPO_PUBLIC_BRIEF_WEATHER_LAT = "not-a-number";
    process.env.EXPO_PUBLIC_BRIEF_WEATHER_LON = "5.2";
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });

    const result = await resolveWeatherCoordinates();
    expect(result).toEqual({ lat: 60.267, lon: 5.377, source: "configured" });
  });
});

describe("resolvePlaceName", () => {
  const placeKey = "EXPO_PUBLIC_BRIEF_WEATHER_PLACE";
  let savedPlace: string | undefined;

  beforeEach(() => {
    jest.resetAllMocks();
    savedPlace = process.env[placeKey];
    delete process.env[placeKey];
  });

  afterEach(() => {
    if (savedPlace === undefined) delete process.env[placeKey];
    else process.env[placeKey] = savedPlace;
  });

  it("uses city only when region matches city", async () => {
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      geocodedAddress({ city: "Oslo", region: "Oslo", country: "Norway", isoCountryCode: "NO" }),
    ]);

    expect(await resolvePlaceName(59.91, 10.75, "en")).toBe("Oslo");
  });

  it("uses street and city when both are present", async () => {
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      geocodedAddress({
        city: "Trondheim",
        region: "Trøndelag",
        country: "Norway",
        street: "Kongens gate",
        isoCountryCode: "NO",
      }),
    ]);

    expect(await resolvePlaceName(63.43, 10.39, "en")).toBe("Trondheim, Trøndelag");
  });

  it("uses subregion when city is missing", async () => {
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      geocodedAddress({
        region: "Vestland",
        country: "Norway",
        subregion: "Askøy",
        isoCountryCode: "NO",
      }),
    ]);

    expect(await resolvePlaceName(60.4, 5.2, "no")).toBe("Askøy, Vestland");
  });

  it("formats reverse geocode as city and region", async () => {
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      geocodedAddress({
        city: "Bergen",
        region: "Vestland",
        country: "Norway",
        isoCountryCode: "NO",
      }),
    ]);

    const label = await resolvePlaceName(60.39, 5.32, "en");
    expect(label).toBe("Bergen, Vestland");
  });

  it("uses env place when geocode fails", async () => {
    process.env.EXPO_PUBLIC_BRIEF_WEATHER_PLACE = "Hagavik";
    mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error("geocode failed"));

    const label = await resolvePlaceName(60.26, 5.37, "no");
    expect(label).toBe("Hagavik");
  });

  it("returns unknown location label when geocode and env are missing", async () => {
    mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

    expect(await resolvePlaceName(0, 0, "en")).toBe("Unknown location");
    expect(await resolvePlaceName(0, 0, "no")).toBe("Ukjent sted");
  });
});
