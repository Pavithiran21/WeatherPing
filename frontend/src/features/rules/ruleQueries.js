import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import { listRules } from '../../api/rules';

/** Every rule of the user, oldest first (see api/queryKeys.js for why it is one list). */
export function useRules() {
  return useQuery({ queryKey: queryKeys.rules, queryFn: listRules, select: (page) => page.items });
}

export function rulesForPlace(rules, locationId) {
  return (rules ?? []).filter((rule) => rule.locationId === locationId);
}
