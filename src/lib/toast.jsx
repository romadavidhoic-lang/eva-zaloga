import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let _id = 0

const ICONS = {
  success: <CheckCircle size={16} className="text-green-500 flex-shrink-0" />,
  error:   <XCircle    size={16} className="text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0" />,
  info:    <Info       size={16} className="text-blue-500 flex-shrink-0" />,
}

const BG = {
  success: 'bg-green-50 border-green-200',
  error:   'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info:    'bg-blue-50 border-blue-200',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(t => [...t, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm animate-fade-in ${BG[toast.type]}`}
          >
            {ICONS[toast.type]}
            <span className="flex-1 text-gray-800">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
