import { Component, ErrorInfo } from 'react'
import {
  logger,
} from '@vectorial/whiteboard/utils'

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
    logger.error('ErrorBoundary error', error)
    logger.error('ErrorBoundary error info', info)
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
