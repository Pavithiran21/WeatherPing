import {
  IconCloud,
  IconCloudFog,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconSun,
  IconSunHigh,
} from '@tabler/icons-react';
import { formatClock } from './timeFormat';

// A spot's short line says "Rain at 7 am" once the rain chance reaches this (UI-UX.md screen 5).
const RAIN_LINE_CHANCE = 60;

// Open-Meteo sends WMO weather codes. Each group gets plain words, one Tabler icon, and
// whether it is wet (the weather card's cloud then shows rain drops).
// https://open-meteo.com/en/docs ("WMO Weather interpretation codes")
const WEATHER_GROUPS = [
  { codes: [0], words: 'Clear', icon: IconSun, wet: false },
  { codes: [1], words: 'Mostly clear', icon: IconSun, wet: false },
  { codes: [2], words: 'Partly cloudy', icon: IconSunHigh, wet: false },
  { codes: [3], words: 'Cloudy', icon: IconCloud, wet: false },
  { codes: [45, 48], words: 'Foggy', icon: IconCloudFog, wet: false },
  { codes: [51, 53, 55, 56, 57], words: 'Drizzle', icon: IconCloudRain, wet: true },
  { codes: [61, 63, 65, 66, 67], words: 'Rain', icon: IconCloudRain, wet: true },
  { codes: [80, 81, 82], words: 'Rain showers', icon: IconCloudRain, wet: true },
  { codes: [71, 73, 75, 77, 85, 86], words: 'Snow', icon: IconCloudSnow, wet: true },
  { codes: [95, 96, 99], words: 'Thunderstorm', icon: IconCloudStorm, wet: true },
];

const UNKNOWN_WEATHER = { words: 'No forecast', icon: IconCloud, wet: false };

/** WMO code -> { words: 'Cloudy', icon: IconCloud, wet: false }. */
export function describeWeather(code) {
  return WEATHER_GROUPS.find((group) => group.codes.includes(code)) ?? UNKNOWN_WEATHER;
}

/** "31°" (rounded), or "–" when the value is missing. */
export function formatTemp(value) {
  return value === null || value === undefined ? '–' : `${Math.round(value)}°`;
}

/**
 * The short line under a spot's name: "Rain at 7 am" when the rain chance reaches 60%
 * in the next 24 hours (time in the user's time zone, like every time in the app),
 * otherwise the current weather in words ("Cloudy").
 */
export function spotLine(forecast, timeZone) {
  const rainyHour = forecast.next24Hours.find((hour) => hour.rainChance !== null && hour.rainChance >= RAIN_LINE_CHANCE);
  if (rainyHour) {
    return `Rain at ${formatClock(rainyHour.time, timeZone)}`;
  }
  return describeWeather(forecast.current.weatherCode).words;
}
