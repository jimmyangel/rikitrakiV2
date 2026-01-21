import 'alpinejs'

declare global {
  // Declare the global Alpine variable
  const Alpine: typeof import('alpinejs')

  interface Window {
    Alpine: typeof import('alpinejs')
  }
}

declare module 'alpinejs' {
  interface Alpine {
    plugin: (callback: (alpine: Alpine) => void) => void
    data: (name: string, callback: (...args: any[]) => any) => void
    store: <T = any>(name: string, value?: T) => T
  }
}

export {}
