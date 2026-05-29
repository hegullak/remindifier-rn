import * as Location from "expo-location";

export interface WeatherCoordinates {
  lat: number;
  lon: number;
  source: "device" | "configured";
}

const DEFAULT_LAT = 60.267;
const DEFAULT_LON = 5.377;

function configuredCoordinates(): WeatherCoordinates | null {
  const latRaw = process.env.EXPO_PUBLIC_BRIEF_WEATHER_LAT;
  const lonRaw = process.env.EXPO_PUBLIC_BRIEF_WEATHER_LON;
  if (!latRaw || !lonRaw) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, source: "configured" };
}

/** Device GPS when permitted; otherwise EXPO_PUBLIC_BRIEF_WEATHER_LAT/LON; else Hagavik default. */
export async function resolveWeatherCoordinates(): Promise<WeatherCoordinates> {
  const configured = configuredCoordinates();
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        source: "device",
      };
    }
  } catch {
    // fall through
  }
  if (configured) return configured;
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON, source: "configured" };
}

export async function resolvePlaceName(
  lat: number,
  lon: number,
  locale: "en" | "no",
): Promise<string> {
  const envPlace = process.env.EXPO_PUBLIC_BRIEF_WEATHER_PLACE?.trim();
  try {
    const lang = locale === "no" ? "no" : "en";
    const url =
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}` +
      `&language=${lang}&count=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        results?: Array<{ name?: string; admin1?: string }>;
      };
      const hit = data.results?.[0];
      if (hit?.name) {
        return hit.admin1 ? `${hit.name}, ${hit.admin1}` : hit.name;
      }
    }
  } catch {
    // fall through
  }
  return envPlace || (locale === "no" ? "din posisjon" : "your location");
}
