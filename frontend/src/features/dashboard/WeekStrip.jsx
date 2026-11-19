import { IconBellRinging } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { describeWeather, formatTemp } from '../../lib/weather';

/**
 * Seven days of highs and lows. A day with an alert already emailed for this place is
 * raised in yellow and shows a bell, so colour is never the only signal.
 */
export function WeekStrip({ days, alertDates, className = '' }) {
  return (
    <section className={className} aria-label="Next 7 days">
      <ol className="grid grid-cols-4 gap-3.5 tab:grid-cols-7">
        {days.map((day, index) => {
          const weather = describeWeather(day.weatherCode);
          const hasAlert = alertDates.has(day.date);
          return (
            <li
              key={day.date}
              className={`rounded-[22px] border-3 border-ink px-1.5 py-3.5 text-center ${
                hasAlert ? '-rotate-2 bg-sun shadow-pop-sm' : 'bg-white'
              }`}
            >
              <p className="flex items-center justify-center gap-1 font-display text-[15px]">
                {index === 0 ? 'Today' : DateTime.fromISO(day.date).toFormat('ccc')}
                {hasAlert && (
                  <>
                    <IconBellRinging size={16} aria-hidden="true" />
                    <span className="sr-only">, alert emailed</span>
                  </>
                )}
              </p>
              <weather.icon size={34} className="mx-auto my-1" role="img" aria-label={weather.words} />
              <b className="block font-display text-[26px] font-bold">{formatTemp(day.temperatureMax)}</b>
              <span className={hasAlert ? undefined : 'text-muted'}>
                <span className="sr-only">low </span>
                {formatTemp(day.temperatureMin)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
