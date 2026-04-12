interface CardProps {
  title?: string;
  action?: React.ReactNode;
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
  className?: string;
  children: React.ReactNode;
}

const paddingMap = { sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({
  title,
  action,
  padding = "md",
  hoverable = false,
  className = "",
  children,
}: CardProps) {
  return (
    <div
      className={`rounded-xl bg-heritage-white border border-heritage-sand/30
        shadow-[0_2px_12px_rgba(74,55,40,0.06)]
        ${hoverable ? "transition-shadow hover:shadow-[0_4px_20px_rgba(74,55,40,0.12)] cursor-pointer" : ""}
        ${paddingMap[padding]}
        ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="font-serif text-lg font-semibold text-heritage-dark">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
