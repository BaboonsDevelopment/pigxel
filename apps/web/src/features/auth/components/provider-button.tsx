const providerClassName =
  "inline-flex h-11 items-center justify-center gap-2.5 rounded-full bg-zinc-100 text-sm font-medium text-foreground transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50";

export function ProviderButton({
  href,
  logo,
  name,
  hint,
}: {
  href?: string;
  logo: React.ReactNode;
  name: string;
  hint?: string;
}) {
  const label = `Continue with ${name}`;
  return href ? (
    <a
      href={href}
      className={providerClassName}
      aria-label={label}
      title={hint}
    >
      {logo}
      {name}
    </a>
  ) : (
    <span title={`${name} sign-in isn’t set up yet`} className="grid">
      <button
        type="button"
        disabled
        className={providerClassName}
        aria-label={`${label} (not set up yet)`}
      >
        {logo}
        {name}
      </button>
    </span>
  );
}

export function AppleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="currentColor"
    >
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.6-4.1ZM13.9 5.1a4.6 4.6 0 0 0 1.1-3.3 4.7 4.7 0 0 0-3.1 1.6 4.4 4.4 0 0 0-1.1 3.2c1.2.1 2.3-.6 3.1-1.5Z" />
    </svg>
  );
}

export function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
