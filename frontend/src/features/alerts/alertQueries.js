import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAlerts, markAllRead } from '../../api/alerts';
import { queryKeys } from '../../api/queryKeys';

export const ALERTS_PAGE_SIZE = 20;

/** One page of sent alerts, newest first; locationId (optional) limits it to one place. */
export function useAlertHistory({ locationId, page }) {
  const filter = { locationId, page, size: ALERTS_PAGE_SIZE };
  return useQuery({
    queryKey: queryKeys.alerts(filter),
    queryFn: () => listAlerts(filter),
    // Keep the current page on screen while the next one loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

/** Marks every alert as read, then refreshes the unread count (sidebar badge and bell dot). */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }),
  });
}
