type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  success: "bg-heritage-forest/10 text-heritage-forest",
  warning: "bg-heritage-gold/15 text-heritage-gold",
  danger:  "bg-heritage-red/10 text-heritage-red",
  neutral: "bg-heritage-sand/40 text-heritage-brown",
  info:    "bg-blue-50 text-blue-700",
};

const sizeMap: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full
        ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {children}
    </span>
  );
}
