"use client";

import { useToastContext } from "@/providers/toast-provider";

export function useToast() {
  const { addToast, removeToast, toasts } = useToastContext();

  return {
    toasts,
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
    remove: removeToast,
  };
}
