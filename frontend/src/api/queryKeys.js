// Every TanStack Query key in one place, so a change can invalidate exactly what it affects.
// Keys are arrays: invalidating ['alerts'] also refreshes ['alerts', 'unread-count'].
export const queryKeys = {
  locations: ['locations'],
  forecast: (locationId) => ['forecast', locationId],
  placeSearch: (q) => ['place-search', q],
  // One list with every rule (a user has only a few), filtered by place on the page, so
  // the dashboard, the Rules page and the "Remove place" count always agree.
  rules: ['rules'],
  alerts: (filter) => ['alerts', 'list', filter],
  unreadCount: ['alerts', 'unread-count'],
  demoAccounts: ['demo-accounts'],
};
