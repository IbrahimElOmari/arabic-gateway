/**
 * @internal
 * This component is an internal implementation detail.
 * DO NOT import this directly in application code.
 * Use `TranslatedErrorBoundary` instead, which wraps this
 * component with i18n-translated fallback messages.
 */
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logError } from "@/lib/error-logger";
import { isLazyModuleLoadError } from "@/lib/lazy-retry";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackButtonText?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, { componentStack: errorInfo.componentStack, source: 'ErrorBoundary' });
  }

  private handleRetry = () => {
    if (isLazyModuleLoadError(this.state.error)) {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {this.props.fallbackTitle || "Er ging iets mis"}
          </h2>
          <p className="max-w-md text-muted-foreground">
            {this.props.fallbackDescription ||
              "Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem contact op met support."}
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-2 max-w-lg overflow-auto rounded-md bg-muted p-4 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {this.props.fallbackButtonText || "Opnieuw proberen"}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
