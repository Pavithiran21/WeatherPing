import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

// Retry a query only when the network dropped. Every other error is an answer from
// the server (a 502 means the backend already retried the weather API), so the
// screen shows it at once with a "Try again" button.
function retryNetworkErrors(failureCount, error) {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR' && failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: retryNetworkErrors,
    },
    mutations: {
      retry: false,
    },
  },
});
