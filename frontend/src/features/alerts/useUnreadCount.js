import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '../../api/alerts';
import { queryKeys } from '../../api/queryKeys';

/** Number of alert emails the user hasn't seen in Alert history yet (sidebar badge, bell dot). */
export function useUnreadCount() {
  const { data } = useQuery({ queryKey: queryKeys.unreadCount, queryFn: getUnreadCount });
  return data?.count ?? 0;
}
