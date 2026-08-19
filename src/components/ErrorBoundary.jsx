import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('iCamagu crashed:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-3">🌾</p>
          <h1 className="font-bold text-lg text-ink mb-2">Something went wrong</h1>
          <p className="text-sm text-ink-muted mb-4 max-w-xs">
            A part of the app hit an error. Your data is safe — try reloading.
          </p>
          <button onClick={() => window.location.reload()} className="bg-sage-500 text-white font-bold px-6 py-3 rounded-pill">
            Reload iCamagu
          </button>
          <details className="mt-6 text-left max-w-xs">
            <summary className="text-xs text-ink-muted cursor-pointer">Technical details</summary>
            <p className="text-[10px] text-ink-muted mt-2 break-all">{this.state.error?.message}</p>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
