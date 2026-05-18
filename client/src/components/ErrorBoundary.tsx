import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Algo salió mal</h1>
            <p className="text-muted-foreground text-sm">
              Ocurrió un error inesperado. Por favor recarga la página.
            </p>
            <pre className="text-xs text-red-600 bg-red-50 dark:bg-red-950 rounded-lg p-4 text-left overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
