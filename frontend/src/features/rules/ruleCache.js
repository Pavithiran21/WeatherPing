import { queryKeys } from '../../api/queryKeys';
import { COULD_NOT_SAVE, errorMessage, isNetworkError } from '../../lib/apiErrors';

// After a rule changes on the server, the cached list is updated at once (so the switch and
// the chart don't wait for a refetch), and then refetched to stay exactly like the server.

/** Puts a created or changed rule into the cached list. */
export function saveRuleInCache(queryClient, rule) {
  queryClient.setQueryData(queryKeys.rules, (page) => {
    if (!page) return page;
    const exists = page.items.some((item) => item.id === rule.id);
    const items = exists ? page.items.map((item) => (item.id === rule.id ? rule : item)) : [...page.items, rule];
    return { ...page, items, totalItems: exists ? page.totalItems : page.totalItems + 1 };
  });
  return queryClient.invalidateQueries({ queryKey: queryKeys.rules });
}

export function removeRuleFromCache(queryClient, ruleId) {
  queryClient.setQueryData(queryKeys.rules, (page) => {
    if (!page) return page;
    const items = page.items.filter((item) => item.id !== ruleId);
    return { ...page, items, totalItems: page.totalItems - (page.items.length - items.length) };
  });
  return queryClient.invalidateQueries({ queryKey: queryKeys.rules });
}

/**
 * Error toast for pause, resume and delete. A 404 means the rule is already gone (for
 * example deleted in another tab), so the list is refreshed to match.
 */
export function showRuleError(error, { toast, queryClient }) {
  if (error.status === 404) {
    queryClient.invalidateQueries({ queryKey: queryKeys.rules });
    toast.error('That rule no longer exists.');
  } else if (isNetworkError(error)) {
    toast.error(COULD_NOT_SAVE);
  } else {
    toast.error(errorMessage(error));
  }
}
