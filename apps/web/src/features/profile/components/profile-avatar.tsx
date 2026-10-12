import { cn } from "@pigxel/ui/lib/utils";

export function ProfileAvatar({
  name,
  url,
  className = "size-9 text-sm",
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  if (url)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from the sign-in provider or Storage
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary-soft leading-none font-semibold text-primary-soft-foreground",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
