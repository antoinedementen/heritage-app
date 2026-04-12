"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données. Veuillez réessayer.",
  onRetry,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-heritage-red/20 bg-heritage-red/5 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-heritage-red shrink-0" />
        <span className="text-sm text-heritage-red">{title}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-xs text-heritage-red/70 hover:text-heritage-red underline"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="h-14 w-14 rounded-full bg-heritage-red/10 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-heritage-red" />
      </div>
      <div>
        <p className="font-semibold text-heritage-dark">{title}</p>
        <p className="text-sm text-heritage-brown mt-0.5 max-w-xs">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} size="sm">
          Réessayer
        </Button>
      )}
    </div>
  );
}
