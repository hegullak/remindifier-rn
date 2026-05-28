export interface BriefWeatherData {
  temp: string;
  description: string;
  goodForRun: boolean;
  icon: string;
  details: Array<{ label: string; value: string }>;
}

const DEFAULT_WEATHER: BriefWeatherData = {
  temp: "11°",
  description: "Partly cloudy · Hagavik",
  goodForRun: true,
  icon: "⛅",
  details: [
    { label: "Wind", value: "3 m/s SW" },
    { label: "Rain", value: "0 mm" },
    { label: "Feels like", value: "9°" },
    { label: "Updated", value: "Fallback" },
  ],
};

const WMO_LABEL: Record<number, { text: string; icon: string }> = {
  0: { text: "Clear sky", icon: "☀️" },
  1: { text: "Mainly clear", icon: "🌤️" },
  2: { text: "Partly cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog", icon: "🌫️" },
  48: { text: "Depositing rime fog", icon: "🌫️" },
  51: { text: "Light drizzle", icon: "🌦️" },
  53: { text: "Drizzle", icon: "🌦️" },
  55: { text: "Dense drizzle", icon: "🌧️" },
  61: { text: "Slight rain", icon: "🌦️" },
  63: { text: "Rain", icon: "🌧️" },
  65: { text: "Heavy rain", icon: "🌧️" },
  71: { text: "Slight snow", icon: "🌨️" },
  73: { text: "Snow", icon: "🌨️" },
  75: { text: "Heavy snow", icon: "❄️" },
  80: { text: "Rain showers", icon: "🌦️" },
  81: { text: "Showers", icon: "🌧️" },
  82: { text: "Heavy showers", icon: "⛈️" },
  95: { text: "Thunderstorm", icon: "⛈️" },
};

function weatherToRunFlag(temp: number, rain: number, wind: number): boolean {
  return temp >= 3 && temp <= 22 && rain <= 0.7 && wind <= 9;
}

export async function fetchBriefWeather(): Promise<BriefWeatherData> {
  const lat = process.env.EXPO_PUBLIC_BRIEF_WEATHER_LAT ?? "60.267";
  const lon = process.env.EXPO_PUBLIC_BRIEF_WEATHER_LON ?? "5.377";
  const place = process.env.EXPO_PUBLIC_BRIEF_WEATHER_PLACE ?? "Hagavik";

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m" +
    "&timezone=auto";

  try {
    const res = await fetch(url);
    if (!res.ok) return DEFAULT_WEATHER;
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        time?: string;
      };
    };
    const c = data.current;
    if (!c) return DEFAULT_WEATHER;

    const temp = c.temperature_2m ?? 11;
    const apparent = c.apparent_temperature ?? temp;
    const rain = c.precipitation ?? 0;
    const wind = c.wind_speed_10m ?? 3;
    const code = c.weather_code ?? 2;
    const lookup = WMO_LABEL[code] ?? { text: "Partly cloudy", icon: "⛅" };
    const updated = c.time
      ? new Date(c.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "Now";

    return {
      temp: `${Math.round(temp)}°`,
      description: `${lookup.text} · ${place}`,
      goodForRun: weatherToRunFlag(temp, rain, wind),
      icon: lookup.icon,
      details: [
        { label: "Wind", value: `${Math.round(wind)} km/h` },
        { label: "Rain", value: `${rain} mm` },
        { label: "Feels like", value: `${Math.round(apparent)}°` },
        { label: "Updated", value: updated },
      ],
    };
  } catch {
    return DEFAULT_WEATHER;
  }
}
