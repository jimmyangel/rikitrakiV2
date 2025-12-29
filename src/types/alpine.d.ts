import 'alpinejs'

declare global {
  interface Window {
    Alpine: typeof import('alpinejs')
  }

  // Extend Alpine's type to include .store()
  namespace Alpine {
    function store<T = any>(name: string, value?: T): T
  }
}

export {}
