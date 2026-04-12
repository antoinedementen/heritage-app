"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center gap-4 py-16 px-4 text-center">
          <div className="h-16 w-16 rounded-full bg-heritage-red/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-heritage-red" />
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-heritage-dark">
              Quelque chose s&apos;est mal passé
            </p>
            <p className="text-sm text-heritage-brown mt-1 max-w-sm">
              {this.state.error?.message ?? "Une erreur inattendue s'est produite."}
            </p>
          </div>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-lg border border-heritage-sand bg-heritage-white px-4 py-2 text-sm font-medium text-heritage-dark hover:bg-heritage-beige transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
