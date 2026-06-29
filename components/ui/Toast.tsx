"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const styles = {
    success: { bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300", Icon: CheckCircle2 },
    error: { bg: "bg-red-500/20 border-red-500/40", text: "text-red-300", Icon: XCircle },
    info: { bg: "bg-gold/20 border-gold/40", text: "text-gold", Icon: AlertCircle },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-xl min-w-[260px] max-w-[380px] ${styles.bg}`}
    >
      <styles.Icon size={16} className={`${styles.text} shrink-0 mt-0.5`} />
      <p className={`text-sm flex-1 ${styles.text}`}>{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className={`${styles.text} opacity-60 hover:opacity-100`}>
        <X size={14} />
      </button>
    </div>
  );
}
