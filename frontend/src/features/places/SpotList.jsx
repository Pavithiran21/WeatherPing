import { IconMapPin, IconMapPinPlus } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { describeWeather, formatTemp, spotLine } from '../../lib/weather';
import { placePath, useForecast, useSelectedPlace } from './placeQueries';

/**
 * "My spots": each place with its weather icon, a short line ("Rain at 7 am") and the
 * temperature now. Used in the sidebar and, on phone, in the place sheet.
 * onPicked is called after a spot is chosen (the phone sheet closes itself with it).
 */
export function SpotList({ onAddSpot, onPicked, headingId = 'spots-title' }) {
  const { places, selected, isPending } = useSelectedPlace();
  const location = useLocation();
  const onDashboard = location.pathname === '/';

  return (
    <div>
      <h4 id={headingId} className="mx-3 mt-[18px] mb-1 font-display text-[13px] tracking-[.08em] uppercase">
        My spots
      </h4>
      {isPending && (
        <div className="px-3" aria-label="Loading your spots">
          <div className="skel" />
          <div className="skel w-3/4" />
        </div>
      )}
      <ul aria-labelledby={headingId} className="flex flex-col gap-1">
        {places.map((place) => (
          <li key={place.id}>
            <SpotLink place={place} active={onDashboard && selected?.id === place.id} onPicked={onPicked} />
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-white mt-1.5 w-full" onClick={onAddSpot}>
        <IconMapPinPlus size={20} aria-hidden="true" /> Add a spot
      </button>
    </div>
  );
}

function SpotLink({ place, active, onPicked }) {
  const { user } = useAuth();
  const forecast = useForecast(place.id);
  const Icon = forecast.data ? describeWeather(forecast.data.current.weatherCode).icon : IconMapPin;

  let line = place.region ?? place.country ?? '';
  if (forecast.data) {
    line = spotLine(forecast.data, user.timeZone);
  }

  return (
    <Link
      to={placePath(place.id)}
      aria-current={active ? 'true' : undefined}
      onClick={onPicked}
      className={`flex items-center gap-2.5 rounded-[18px] border-[2.5px] px-3 py-2.5 text-[15px] ${
        active ? 'border-ink bg-white/70' : 'border-transparent'
      }`}
    >
      <Icon size={24} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-display">
        <span className="block truncate">{place.name}</span>
        <small className="block truncate font-body text-xs text-muted">{line}</small>
      </span>
      {forecast.isPending ? (
        <span className="skel m-0 h-4 w-8" aria-label="Loading temperature" />
      ) : (
        <b className="font-display text-xl font-bold">
          {forecast.isError ? '–' : formatTemp(forecast.data.current.temperature)}
        </b>
      )}
    </Link>
  );
}
