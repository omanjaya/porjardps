export function registerServiceWorker() {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // SW registered successfully
        })
        .catch(() => {
          // SW registration failed
        })
    })
  }
}
