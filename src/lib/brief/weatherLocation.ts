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

function formatReverseGeocode(hit: Location.LocationGeocodedAddress): string | null {
  const city = hit.city ?? hit.subregion ?? hit.district ?? hit.name;
  const region = hit.region ?? hit.country;
  if (city && region && city !== region) return `${city}, ${region}`;
  if (city) return city;
  if (hit.street && hit.city) return `${hit.street}, ${hit.city}`;
  if (region) return region;
  if (hit.name) return hit.name;
  return null;
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
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const label = places[0] ? formatReverseGeocode(places[0]) : null;
    if (label) return label;
  } catch {
    // fall through
  }

  return envPlace || (locale === "no" ? "Ukjent sted" : "Unknown location");
}
