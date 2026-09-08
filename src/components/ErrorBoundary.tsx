import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Backstop for unexpected render errors.
 *
 * Decoding a shared link is the risky operation here and it is handled
 * explicitly, but without a boundary any other throw during render unmounts the
 * tree and leaves a blank page — which is what the previous build did whenever
 * a link arrived truncated.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QuickJot crashed:', error, info.componentStack)
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <TriangleAlert className="text-warning size-10" />
        <h1 className="text-2xl font-semibold tracking-tight">QuickJot hit an unexpected error</h1>
        <p className="text-muted-foreground">
          Your note is still in the address bar. Copy the URL before reloading if you want to keep
          it.
        </p>
        <pre className="bg-muted text-muted-foreground w-full overflow-x-auto rounded-md border p-3 text-left text-xs">
          {error.message}
        </pre>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}
