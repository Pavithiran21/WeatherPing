import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/**
 * toast.success(message, { icon, tone, action }) shows a 4-second toast (role="status").
 * toast.error(message) shows one that stays until dismissed (role="alert").
 */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return toast;
}
