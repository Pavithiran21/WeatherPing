import { IconLeaf, IconSnowflake, IconTemperatureSun, IconUmbrella, IconWind } from '@tabler/icons-react';
import { formatDate, formatWindow, windowInWords } from './timeFormat';

/**
 * Everything the screens need to know about each alert condition: wording, icon, colour
 * and the allowed threshold range. Ranges and messages are copied from
 * backend/src/modules/rules/conditions.js (and UI-UX.md "Validation messages") so the form
 * can check them before sending; the backend still checks every rule itself.
 *
 * Rules trigger when the forecast reaches the threshold (inclusive): at or above it,
 * except Cold, which triggers at or below it.
 */
export const CONDITIONS = {
  rain: {
    label: 'Rain',
    tileLabel: 'Rain',
    icon: IconUmbrella,
    tint: 'bg-sky-soft',
    min: 10,
    max: 100,
    step: 5,
    defaultThreshold: 60,
    rangeMessage: 'Pick a chance between 10% and 100%.',
    sliderLabel: 'Chance of rain at least',
    value: (threshold) => `${threshold}%`,
    short: (threshold) => `${threshold}%+ chance`,
    phrase: (threshold) => `there's a ${threshold}%+ chance of rain`,
    headline: 'Rain expected',
    formatForecast: (value) => `${value}%`,
    fact: (value) => ({ value: `${value}%`, label: 'chance' }),
  },
  heat: {
    label: 'Heat',
    tileLabel: 'Heat',
    icon: IconTemperatureSun,
    tint: 'bg-sun-soft',
    min: 20,
    max: 55,
    step: 1,
    defaultThreshold: 38,
    rangeMessage: 'Enter a temperature between 20 and 55 °C.',
    sliderLabel: 'Heat at least (°C)',
    value: (threshold) => `${threshold} °C`,
    short: (threshold) => `${threshold} °C or hotter`,
    phrase: (threshold) => `it's ${threshold} °C or hotter`,
    headline: 'Heat expected',
    formatForecast: (value) => `${value} °C`,
    fact: (value) => ({ value: `${value}°`, label: 'at its hottest' }),
  },
  cold: {
    label: 'Cold',
    tileLabel: 'Cold',
    icon: IconSnowflake,
    tint: 'bg-grape-soft',
    min: -30,
    max: 20,
    step: 1,
    defaultThreshold: 10,
    rangeMessage: 'Enter a temperature between -30 and 20 °C.',
    sliderLabel: 'Cold at most (°C)',
    value: (threshold) => `${threshold} °C`,
    short: (threshold) => `${threshold} °C or colder`,
    phrase: (threshold) => `it's ${threshold} °C or colder`,
    headline: 'Cold expected',
    formatForecast: (value) => `${value} °C`,
    fact: (value) => ({ value: `${value}°`, label: 'at its coldest' }),
  },
  wind: {
    label: 'Wind',
    tileLabel: 'Wind',
    icon: IconWind,
    tint: 'bg-mist',
    min: 10,
    max: 150,
    step: 5,
    defaultThreshold: 40,
    rangeMessage: 'Enter a wind speed between 10 and 150 km/h.',
    sliderLabel: 'Wind at least (km/h)',
    value: (threshold) => `${threshold} km/h`,
    short: (threshold) => `${threshold} km/h or more`,
    phrase: (threshold) => `the wind reaches ${threshold} km/h`,
    headline: 'Strong wind expected',
    formatForecast: (value) => `${value} km/h`,
    fact: (value) => ({ value: `${value}`, label: 'km/h wind' }),
  },
  aqi: {
    label: 'Air quality',
    tileLabel: 'Air',
    icon: IconLeaf,
    tint: 'bg-mint-soft',
    min: 50,
    max: 500,
    step: 10,
    defaultThreshold: 150,
    rangeMessage: 'Enter an AQI between 50 and 500.',
    sliderLabel: 'Air quality (US AQI) at least',
    value: (threshold) => `AQI ${threshold}`,
    short: (threshold) => `AQI ${threshold} or worse`,
    phrase: (threshold) => `air quality (US AQI) reaches ${threshold}`,
    headline: 'Poor air expected',
    formatForecast: (value) => `AQI ${value}`,
    fact: (value) => ({ value: `${value}`, label: 'US AQI' }),
  },
};

export const CONDITION_NAMES = Object.keys(CONDITIONS);

/** The second line of a rule row: "7–9 am · 60%+ chance", or "Paused · 7–9 am · 60%+ chance". */
export function ruleDetails(rule) {
  const details = `${formatWindow(rule.windowStart, rule.windowEnd)} · ${CONDITIONS[rule.condition].short(rule.threshold)}`;
  return rule.status === 'paused' ? `Paused · ${details}` : details;
}

/**
 * The end of the rule dialog's preview sentence ("You'll get one email when …"):
 * "there's a 60%+ chance of rain between 7 and 9 am in Chennai".
 */
export function previewText({ condition, threshold, windowStart, windowEnd, placeName }) {
  const where = placeName ? ` in ${placeName}` : '';
  return `${CONDITIONS[condition].phrase(threshold)} ${windowInWords(windowStart, windowEnd)}${where}`;
}

/**
 * Alert history title, with the day the alert is for: "Rain expected Wed 21 Oct, 7–9 am",
 * "Heat expected Wed 21 Oct · 39 °C", "Poor air expected Wed 21 Oct · AQI 160".
 * The day matters: one run can email today's and tomorrow's event for the same rule.
 */
export function alertTitle(alert) {
  const condition = CONDITIONS[alert.condition];
  const day = formatDate(alert.eventDate);
  if (alert.condition === 'rain') {
    return `${condition.headline} ${day}, ${formatWindow(alert.windowStart, alert.windowEnd)}`;
  }
  return `${condition.headline} ${day} · ${condition.formatForecast(alert.forecastValue)}`;
}
