import React, { createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'

const SelectContext = createContext()

export const Select = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useContext(SelectContext)
  
  return (
    <button
      type="button"
      ref={ref}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

export const SelectValue = ({ placeholder }) => {
  const { value } = useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

export const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useContext(SelectContext)
  
  if (!open) return null
  
  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setOpen(false)}
      />
      <div
        ref={ref}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
SelectContent.displayName = 'SelectContent'

export const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { onValueChange, setOpen, value: selectedValue } = useContext(SelectContext)
  const isSelected = selectedValue === value
  
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        isSelected && 'bg-accent',
        className
      )}
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
})
SelectItem.displayName = 'SelectItem'
