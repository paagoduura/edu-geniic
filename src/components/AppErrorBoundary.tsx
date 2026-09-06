import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode }
interface State { hasError: boolean; errorId: string | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorId: null };

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const errorId = this.state.errorId ?? 'unknown';
    console.error('Unhandled application error', { errorId, error, componentStack: info.componentStack });
    // The structured payload is intentionally provider-neutral. A hosted
    // deployment can forward this event to its error-monitoring collector.
    window.dispatchEvent(new CustomEvent('edugenie:error', {
      detail: { errorId, message: error.message, stack: error.stack, componentStack: info.componentStack },
    }));
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen grid place-items-center p-6 bg-background text-foreground">
        <section role="alert" aria-labelledby="application-error-title" className="max-w-lg text-center space-y-4">
          <h1 id="application-error-title" className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">Your work is safe. Reload the page to continue, or contact your school administrator with the reference below.</p>
          {this.state.errorId && <code className="block text-sm text-muted-foreground">Reference: {this.state.errorId}</code>}
          <Button onClick={() => window.location.reload()}>Reload application</Button>
        </section>
      </main>
    );
  }
}
