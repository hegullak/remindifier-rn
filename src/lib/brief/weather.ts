import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
import { resolvePlaceName, resolveWeatherCoordinates } from "@/lib/brief/weatherLocation";

export interface BriefWeatherDetail {
  icon: string;
  label: string;
  value: string;
}

export interface BriefWeatherData {
  temp: string;
  description: string;
  goodForRun: boolean;
  icon: string;
  locationLabel: string;
  details: BriefWeatherDetail[];
}

const WMO_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95] as const;

const WMO_ICONS: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌦️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  95: "⛈️",
};

function wmoText(code: number, locale: Locale): string {
  const key = WMO_CODES.includes(code as (typeof WMO_CODES)[number])
    ? `weather.conditions.c${code}`
    : "weather.conditions.c2";
  return translate(locale, key);
}

function wmoIcon(code: number): string {
  return WMO_ICONS[code] ?? "⛅";
}

function weatherToRunFlag(temp: number, rain: number, wind: number): boolean {
  return temp >= 3 && temp <= 22 && rain <= 0.7 && wind <= 9;
}

function fallbackWeather(locale: Locale): BriefWeatherData {
  const place = process.env.EXPO_PUBLIC_BRIEF_WEATHER_PLACE ?? "Hagavik";
  return {
    temp: "11°",
    description: translate(locale, "weather.currentForecast", {
      condition: translate(locale, "weather.conditions.c2"),
    }),
    goodForRun: true,
    icon: "⛅",
    locationLabel: place,
    details: [
      { icon: "💨", label: translate(locale, "weather.wind"), value: "3 m/s SW" },
      { icon: "🌧️", label: translate(locale, "weather.rain"), value: "0 mm" },
      { icon: "🌡️", label: translate(locale, "weather.feelsLike"), value: "9°" },
      { icon: "💧", label: translate(locale, "weather.humidity"), value: "72%" },
      {
        icon: "🕐",
        label: translate(locale, "weather.updated"),
        value: translate(locale, "weather.fallback"),
      },
    ],
  };
}

export async function fetchBriefWeather(locale: Locale): Promise<BriefWeatherData> {
  const coords = await resolveWeatherCoordinates();
  const place = await resolvePlaceName(coords.lat, coords.lon, locale);

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
    "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,cloud_cover" +
    "&timezone=auto";

  try {
    const res = await fetch(url);
    if (!res.ok) return fallbackWeather(locale);
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        relative_humidity_2m?: number;
        cloud_cover?: number;
        time?: string;
      };
    };
    const c = data.current;
    if (!c) return fallbackWeather(locale);

    const temp = c.temperature_2m ?? 11;
    const apparent = c.apparent_temperature ?? temp;
    const rain = c.precipitation ?? 0;
    const wind = c.wind_speed_10m ?? 3;
    const humidity = c.relative_humidity_2m ?? 0;
    const cloud = c.cloud_cover ?? 0;
    const code = c.weather_code ?? 2;
    const condition = wmoText(code, locale);
    const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
    const updated = c.time
      ? new Date(c.time).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })
      : translate(locale, "weather.now");

    return {
      temp: `${Math.round(temp)}°`,
      description: translate(locale, "weather.currentForecast", { condition }),
      goodForRun: weatherToRunFlag(temp, rain, wind),
      icon: wmoIcon(code),
      locationLabel: place,
      details: [
        { icon: "💨", label: translate(locale, "weather.wind"), value: `${Math.round(wind)} km/h` },
        { icon: "🌧️", label: translate(locale, "weather.rain"), value: `${rain} mm` },
        {
          icon: "🌡️",
          label: translate(locale, "weather.feelsLike"),
          value: `${Math.round(apparent)}°`,
        },
        {
          icon: "💧",
          label: translate(locale, "weather.humidity"),
          value: `${Math.round(humidity)}%`,
        },
        {
          icon: "☁️",
          label: translate(locale, "weather.cloudCover"),
          value: `${Math.round(cloud)}%`,
        },
        {
          icon: coords.source === "device" ? "📍" : "🗺️",
          label: translate(locale, "weather.location"),
          value: place,
        },
        { icon: "🕐", label: translate(locale, "weather.updated"), value: updated },
      ],
    };
  } catch {
    return fallbackWeather(locale);
  }
}
