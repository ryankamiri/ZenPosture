import { createContext, useContext, useState } from 'react'

const ToastContext = createContext({})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  return (
    <ToastContext.Provider value={{ toasts, setToasts }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const { toasts, setToasts } = context

  const toast = ({ title, description, duration = 5000 }) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { id, title, description }
    setToasts((prevToasts) => [...prevToasts, newToast])
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id))
    }, duration)
  }

  return { toast, toasts }
} 