import { type LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-heritage-beige">
        <Icon className="h-8 w-8 text-heritage-brown" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-heritage-dark mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-heritage-brown max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="md">
          {action.label}
        </Button>
      )}
    </div>
  );
}
