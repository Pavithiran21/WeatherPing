import { IconChevronDown, IconDroplet, IconLeaf, IconMapPin, IconTrash, IconUmbrella, IconWind } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { CloudArt, SunArt } from '../../components/Illustrations';
import { describeWeather, formatTemp } from '../../lib/weather';

/** The sky-blue card: temperature now, feels like, and four small facts (screen 5; screen 13 on phone). */
export function CurrentWeatherCard({ place, forecast, onRemove, onSwitchPlace, className = '' }) {
  const { current } = forecast;
  const weather = describeWeather(current.weatherCode);
  // The place's own date: it is the place's weather.
  const today = DateTime.now().setZone(forecast.timeZone).toFormat('ccc d LLL');

  return (
    <section className={`box relative overflow-hidden bg-sky p-[22px] ${className}`} aria-labelledby="now-title">
      <h3 id="now-title" className="sr-only">
        Weather now in {place.name}
      </h3>
      <div className="relative z-10 flex items-center gap-1.5">
        {/* Phone has no sidebar, so the place chip opens the list of spots. 44 px tall: easy to tap. */}
        <button type="button" className="tag min-h-11 bg-white tab:hidden" onClick={onSwitchPlace}>
          <IconMapPin size={16} aria-hidden="true" /> {place.name} · {today}
          <IconChevronDown size={16} aria-hidden="true" />
          <span className="sr-only">, change place</span>
        </button>
        <span className="tag hidden bg-white tab:inline-flex">
          <IconMapPin size={16} aria-hidden="true" /> {place.name} · {today}
        </span>
        <button
          type="button"
          className="icon-btn size-11 rounded-[14px] tab:size-[38px]"
          aria-label={`Remove ${place.name} from my spots`}
          title="Remove this place"
          onClick={onRemove}
        >
          <IconTrash size={18} aria-hidden="true" />
        </button>
      </div>

      <p className="big-temp relative z-10 mt-4 mb-2 text-[96px] tab:text-[120px]">{formatTemp(current.temperature)}</p>
      <p className="relative z-10 font-display text-xl tab:text-[22px]">
        {weather.words} · feels {formatTemp(current.feelsLike)}
      </p>

      <SunArt size={150} className="absolute -top-3 right-[120px] hidden tab:block" />
      <CloudArt
        width={170}
        height={145}
        rain={weather.wet}
        className="absolute top-14 right-0 w-[120px] tab:top-11 tab:right-1.5 tab:w-[170px]"
      />

      <dl className="relative z-10 mt-[18px] grid grid-cols-2 gap-2.5 tab:grid-cols-4">
        <Fact icon={IconDroplet} label="Humidity" value={withUnit(current.humidity, '%')} />
        <Fact icon={IconWind} label="Wind" value={withUnit(round(current.windSpeed), ' km/h')} />
        <Fact icon={IconUmbrella} label="Rain" value={withUnit(current.rainChance, '%')} />
        <Fact icon={IconLeaf} label="Air" value={withUnit(current.usAqi, '')} />
      </dl>
    </section>
  );
}

function round(value) {
  return value === null || value === undefined ? null : Math.round(value);
}

// A value the weather service didn't send shows as "–" (the air-quality API can fail alone).
function withUnit(value, unit) {
  return value === null || value === undefined ? '–' : `${value}${unit}`;
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[18px] border-3 border-ink bg-white px-3 py-2.5">
      <dt className="flex items-center gap-1 text-xs text-muted">
        <Icon size={14} aria-hidden="true" /> {label}
      </dt>
      <dd className="font-display text-[22px] font-bold">{value}</dd>
    </div>
  );
}
