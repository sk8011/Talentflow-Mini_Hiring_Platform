// Debug component to check environment variables
// Add this to any component temporarily to debug env vars
export function EnvDebug() {
  if (typeof window !== 'undefined') {
    console.log('=== ENVIRONMENT VARIABLES DEBUG ===')
    console.log('VITE_HR_MASTER:', import.meta.env.VITE_HR_MASTER)
    console.log('VITE_SERVICE_ID:', import.meta.env.VITE_SERVICE_ID)
    console.log('VITE_TEMPLATE_ID:', import.meta.env.VITE_TEMPLATE_ID)
    console.log('VITE_PUBLIC_KEY:', import.meta.env.VITE_PUBLIC_KEY)
    console.log('All env vars:', import.meta.env)
    console.log('================================')
  }

  return null // Don't render anything
}

// Usage: Add <EnvDebug /> to any component to see env vars in console
