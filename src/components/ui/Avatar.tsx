import { getInitials } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  src,
  firstName,
  lastName,
  size = "md",
  className = "",
}: AvatarProps) {
  const initials = getInitials(firstName, lastName);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${firstName ?? ""} ${lastName ?? ""}`.trim()}
        className={`rounded-full object-cover ${sizeMap[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-heritage-forest text-white
        flex items-center justify-center font-semibold select-none
        ${sizeMap[size]} ${className}`}
    >
      {initials || "?"}
    </div>
  );
}
