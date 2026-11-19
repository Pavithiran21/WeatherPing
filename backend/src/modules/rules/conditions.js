const { windowInWords } = require('./timeFormat');

/**
 * Everything that differs between alert conditions lives here, so validation,
 * the rule summary, the evaluator and the email all use the same definitions.
 *
 * Each rule "triggers" when the forecast reaches the threshold (inclusive):
 * rain chance, heat, wind and AQI at or above it ("above"); cold at or below it ("below").
 * source and reading say which hourly value the evaluator compares.
 * Ranges and messages match UI-UX.md.
 */
const CONDITIONS = {
  rain: {
    label: 'Rain',
    min: 10,
    max: 100,
    rangeMessage: 'Pick a chance between 10% and 100%.',
    source: 'forecast',
    reading: 'rainChance',
    direction: 'above',
    describe: (threshold) => `rain chance is ${threshold}% or more`,
    formatValue: (value) => `${value}% chance of rain`,
    headline: 'Rain expected',
    fact: (value) => ({ value: `${value}%`, label: 'chance of rain' }),
  },
  heat: {
    label: 'Heat',
    min: 20,
    max: 55,
    rangeMessage: 'Enter a temperature between 20 and 55 °C.',
    source: 'forecast',
    reading: 'temperature',
    direction: 'above',
    describe: (threshold) => `it's ${threshold} °C or hotter`,
    formatValue: (value) => `${value} °C`,
    headline: 'Heat expected',
    fact: (value) => ({ value: `${value}°C`, label: 'at its hottest' }),
  },
  cold: {
    label: 'Cold',
    min: -30,
    max: 20,
    rangeMessage: 'Enter a temperature between -30 and 20 °C.',
    source: 'forecast',
    reading: 'temperature',
    direction: 'below',
    describe: (threshold) => `it's ${threshold} °C or colder`,
    formatValue: (value) => `${value} °C`,
    headline: 'Cold expected',
    fact: (value) => ({ value: `${value}°C`, label: 'at its coldest' }),
  },
  wind: {
    label: 'Wind',
    min: 10,
    max: 150,
    rangeMessage: 'Enter a wind speed between 10 and 150 km/h.',
    source: 'forecast',
    reading: 'windSpeed',
    direction: 'above',
    describe: (threshold) => `wind reaches ${threshold} km/h`,
    formatValue: (value) => `${value} km/h wind`,
    headline: 'Strong wind expected',
    fact: (value) => ({ value: `${value}`, label: 'km/h wind' }),
  },
  aqi: {
    label: 'Air quality',
    min: 50,
    max: 500,
    rangeMessage: 'Enter an AQI between 50 and 500.',
    source: 'airQuality',
    reading: 'usAqi',
    direction: 'above',
    describe: (threshold) => `air quality (US AQI) reaches ${threshold}`,
    formatValue: (value) => `US AQI ${value}`,
    headline: 'Poor air expected',
    fact: (value) => ({ value: `${value}`, label: 'US AQI' }),
  },
};

const CONDITION_NAMES = Object.keys(CONDITIONS);

/** Plain-language summary, for example "rain chance is 60% or more between 7 and 9 am". */
function describeRule(rule) {
  const condition = CONDITIONS[rule.condition];
  return `${condition.describe(rule.threshold)} ${windowInWords(rule.windowStart, rule.windowEnd)}`;
}

module.exports = { CONDITIONS, CONDITION_NAMES, describeRule };
