import React from 'react'
import { cn } from '../../lib/utils'

export const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('relative overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40', className)}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--primary) / 0.2) transparent',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  )
})

ScrollArea.displayName = 'ScrollArea'
