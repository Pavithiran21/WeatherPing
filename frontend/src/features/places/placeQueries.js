import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { getForecast, listLocations } from '../../api/locations';
import { queryKeys } from '../../api/queryKeys';

// Forecasts change slowly and the backend calls the weather API for each request, so a
// spot's forecast is reused for 5 minutes (the sidebar and the dashboard share it).
const FORECAST_STALE_MS = 5 * 60_000;

/** The user's places, oldest first. */
export function useLocations() {
  return useQuery({ queryKey: queryKeys.locations, queryFn: listLocations, select: (page) => page.items });
}

export function useForecast(locationId) {
  return useQuery({
    queryKey: queryKeys.forecast(locationId),
    queryFn: () => getForecast(locationId),
    enabled: Boolean(locationId),
    staleTime: FORECAST_STALE_MS,
  });
}

/**
 * The place shown on the dashboard. It lives in the URL (/?place=<id>), so a reload or
 * the Back button keeps it; without one (or with an id that is gone) the first place is used.
 */
export function useSelectedPlace() {
  const locations = useLocations();
  const [searchParams] = useSearchParams();
  const places = locations.data ?? [];
  const wantedId = searchParams.get('place');
  const selected = places.find((place) => place.id === wantedId) ?? places[0] ?? null;
  return { ...locations, places, selected };
}

/** Link to a place on the dashboard. */
export function placePath(locationId) {
  return `/?place=${locationId}`;
}
