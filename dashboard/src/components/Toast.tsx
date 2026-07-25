import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

const TONE: Record<ToastKind, string> = {
  success: 'bg-green-600 dark:bg-green-500',
  error: 'bg-red-600 dark:bg-red-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind) => {
    const id = Date.now();
    setToast({ id, message, kind });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          data-testid="toast"
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${TONE[toast.kind]}`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
