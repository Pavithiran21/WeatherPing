import { IconTemperature, IconUmbrella } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { CONDITIONS } from '../../lib/conditions';
import { formatClock, formatWindow } from '../../lib/timeFormat';

// Drawing area. Wide uses the design's coordinates (viewBox 640 x 220). A phone card is
// about 300 px wide, so it draws on a narrower canvas with fewer time labels; otherwise
// the whole drawing (text included) would shrink to half size.
const LAYOUTS = {
  wide: { width: 640, xFirst: 38, xLast: 600, barWidth: 20, labelHours: [0, 4, 8, 12, 16, 20, 23] },
  phone: { width: 340, xFirst: 22, xLast: 318, barWidth: 10, labelHours: [0, 6, 12, 18, 23] },
};
const HEIGHT = 220;
const BASELINE = 180;
const BAR_MAX = 160;
const LINE_TOP = 44;
const LINE_BOTTOM = 122;
// Rule labels sit in a band above the dashed blocks, so the peak label never covers them.
const LABEL_BAND = 16;
const BLOCK_TOP = 24;
const PEAK_LABEL_TOP = 26;

const INK = '#1d1a3a';
const CORAL = '#ff6b5b';
const SKY = '#3fb6ff';
const SUN = '#ffd23f';

/**
 * Next 24 hours: rain chance as bars (every 2 hours), temperature as a line, and the
 * place's active rule windows as dashed yellow blocks. Plain SVG, no chart library.
 * Times are in the user's time zone, like the rule windows.
 */
export function ForecastChart({ hours, rules, timeZone, className = '' }) {
  const layout = useMediaQuery(PHONE_QUERY) ? LAYOUTS.phone : LAYOUTS.wide;
  const temps = hours.map((hour) => hour.temperature).filter((value) => value !== null);
  if (hours.length < 2 || temps.length === 0) {
    return (
      <section className={`box p-[22px] ${className}`}>
        <h3 className="text-[22px]">Next 24 hours</h3>
        <p className="mt-2 text-muted">The weather service sent no hourly forecast for this place.</p>
      </section>
    );
  }

  const step = (layout.xLast - layout.xFirst) / (hours.length - 1);
  const xAt = (index) => layout.xFirst + index * step;

  const low = Math.min(...temps);
  const high = Math.max(...temps);
  const yForTemp = (value) =>
    high === low ? (LINE_TOP + LINE_BOTTOM) / 2 : LINE_BOTTOM - ((value - low) / (high - low)) * (LINE_BOTTOM - LINE_TOP);

  const linePoints = hours
    .map((hour, index) => (hour.temperature === null ? null : `${xAt(index)},${yForTemp(hour.temperature)}`))
    .filter(Boolean)
    .join(' ');

  const peakIndex = hours.findIndex((hour) => hour.temperature === high);
  const peak = { x: xAt(peakIndex), y: yForTemp(high), text: `${Math.round(high)}° ${formatClock(hours[peakIndex].time, timeZone)}` };
  const labelX = Math.min(peak.x + 24, layout.width - 96);
  const labelY = Math.max(peak.y - 34, PEAK_LABEL_TOP);

  const windows = ruleWindows(hours, rules, timeZone);

  return (
    <section className={`box p-[22px] ${className}`} aria-labelledby="chart-title">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <h3 id="chart-title" className="flex-1 text-[22px] whitespace-nowrap">
          Next 24 hours
        </h3>
        <span className="flex gap-2.5">
          <span className="tag bg-coral-soft">
            <IconTemperature size={16} aria-hidden="true" /> Temp
          </span>
          <span className="tag bg-sky-soft">
            <IconUmbrella size={16} aria-hidden="true" /> Rain
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${layout.width} ${HEIGHT}`} width="100%" role="img" aria-label={summary(hours, windows, timeZone, high, low, peakIndex)}>
        {windows.map((window) => (
          <g key={`${window.label}-${window.from}`}>
            <rect
              x={xAt(window.from) - step / 2}
              y={BLOCK_TOP}
              width={(window.to - window.from + 1) * step}
              height={BASELINE - BLOCK_TOP}
              rx="16"
              fill={SUN}
              stroke={INK}
              strokeWidth="3"
              strokeDasharray="8 6"
            />
            <text
              x={xAt(window.from) - step / 2 + ((window.to - window.from + 1) * step) / 2}
              y={LABEL_BAND}
              textAnchor="middle"
              fontFamily="Fredoka"
              fontSize="15"
              fontWeight="600"
              fill={INK}
            >
              {window.label}
            </text>
          </g>
        ))}

        <g fill={SKY} stroke={INK} strokeWidth="2.5">
          {hours.map((hour, index) =>
            index % 2 === 0 && hour.rainChance !== null ? (
              <rect
                key={hour.time}
                x={xAt(index) - layout.barWidth / 2}
                y={BASELINE - barHeight(hour.rainChance)}
                width={layout.barWidth}
                height={barHeight(hour.rainChance)}
                rx="6"
              />
            ) : null,
          )}
        </g>

        <polyline points={linePoints} fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={linePoints} fill="none" stroke={CORAL} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={peak.x} cy={peak.y} r="10" fill="#fff" stroke={INK} strokeWidth="3.5" />
        <rect x={labelX} y={labelY} width="92" height="32" rx="12" fill={CORAL} stroke={INK} strokeWidth="3" />
        <text x={labelX + 46} y={labelY + 22} textAnchor="middle" fill={INK} fontFamily="Fredoka" fontSize="16" fontWeight="600">
          {peak.text}
        </text>

        <g fontFamily="Fredoka" fontSize="14" fontWeight="600" fill={INK} textAnchor="middle">
          {layout.labelHours.filter((index) => index < hours.length).map((index) => (
            <text key={index} x={xAt(index)} y="208">
              {index === 0 ? 'Now' : formatClock(hours[index].time, timeZone)}
            </text>
          ))}
        </g>
      </svg>
    </section>
  );
}

// A small bar still shows for a low chance, so "10%" doesn't look like missing data.
function barHeight(rainChance) {
  return Math.max(6, (rainChance / 100) * BAR_MAX);
}

/**
 * The hours (as index ranges into `hours`) that fall inside an active rule's window.
 * A window can appear twice in 24 hours (this evening and tomorrow evening), so each
 * run of matching hours becomes its own block.
 */
function ruleWindows(hours, rules, timeZone) {
  const blocks = [];
  for (const rule of rules) {
    if (rule.status !== 'active') continue;
    let from = null;
    hours.forEach((hour, index) => {
      const local = DateTime.fromISO(hour.time).setZone(timeZone).toFormat('HH:mm');
      const inside = local >= rule.windowStart && local < rule.windowEnd;
      if (inside && from === null) from = index;
      if (!inside && from !== null) {
        blocks.push({ label: CONDITIONS[rule.condition].tileLabel, rule, from, to: index - 1 });
        from = null;
      }
    });
    if (from !== null) {
      blocks.push({ label: CONDITIONS[rule.condition].tileLabel, rule, from, to: hours.length - 1 });
    }
  }
  return blocks;
}

/** The chart in words, for screen readers (role="img"). */
function summary(hours, windows, timeZone, high, low, peakIndex) {
  const rainiest = hours.reduce((best, hour) => ((hour.rainChance ?? -1) > (best.rainChance ?? -1) ? hour : best), hours[0]);
  const parts = [
    `Next 24 hours: temperature ${Math.round(low)}° to ${Math.round(high)}°, warmest at ${formatClock(hours[peakIndex].time, timeZone)}.`,
    `Rain chance up to ${rainiest.rainChance ?? 0}% around ${formatClock(rainiest.time, timeZone)}.`,
  ];
  const ruleNames = [...new Set(windows.map((window) => `${CONDITIONS[window.rule.condition].label} ${formatWindow(window.rule.windowStart, window.rule.windowEnd)}`))];
  parts.push(ruleNames.length > 0 ? `Your rule windows: ${ruleNames.join(', ')}.` : 'No active rule windows.');
  return parts.join(' ');
}
