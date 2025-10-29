import React, { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { Button } from '../ui/Button'

export default function Toast({ toasts = [], onRemove }) {
  // Local sweeper: periodically remove expired toasts so parent App doesn't need to re-render on a timer
  useEffect(() => {
    if (!toasts || toasts.length === 0) return
    const iv = setInterval(() => {
      const now = Date.now()
      toasts.forEach((t) => {
        if (t.expiresAt && t.expiresAt <= now) {
          onRemove && onRemove(t.id)
        }
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [toasts, onRemove])

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return <Info className="h-5 w-5 text-primary" />
    }
  }

  return (
    <div className="fixed right-4 top-20 z-[9999] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
      {toasts.map((t, index) => (
        <div
          key={t.id}
          className="animate-slide-in bg-card border shadow-lg rounded-lg p-4 flex items-start gap-3"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {getIcon(t.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t.message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onRemove(t.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
