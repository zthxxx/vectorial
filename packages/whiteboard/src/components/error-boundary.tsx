import { Component, ErrorInfo } from 'react'

export class ErrorBoundary extends Component<{}, { error?: Error }> {
  constructor(props: {}) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary error', error)
    console.error('ErrorBoundary error info', info)
  }

  render() {
    if (this.state.error) {
      return (
        <>
          <h1>Something went wrong.</h1>
          <p>{this.state.error}</p>
        </>
      )
    }

    return this.props.children
  }
}
