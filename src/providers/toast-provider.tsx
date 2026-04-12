"use client";

import { CheckCircle, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Conteneur de toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-4 w-4 text-heritage-forest shrink-0" />,
    error:   <XCircle className="h-4 w-4 text-heritage-red shrink-0" />,
    info:    <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  };

  const styles: Record<ToastType, string> = {
    success: "border-heritage-forest/20 bg-heritage-white",
    error:   "border-heritage-red/20 bg-heritage-white",
    info:    "border-blue-200 bg-heritage-white",
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl
        border px-4 py-3 shadow-[0_4px_16px_rgba(74,55,40,0.12)]
        ${styles[toast.type]}`}
    >
      {icons[toast.type]}
      <p className="text-sm text-heritage-dark flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-heritage-brown hover:text-heritage-dark transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
