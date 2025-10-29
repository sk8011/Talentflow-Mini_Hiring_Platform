import React from 'react'
import { cn } from '../../lib/utils'

export const Alert = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        {
          'bg-background text-foreground': variant === 'default',
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  )
})
Alert.displayName = 'Alert'

export const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'
