export function StatsIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" />
    </svg>
  );
}
