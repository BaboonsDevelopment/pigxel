"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";

/** A password field with a toggle that reveals what was typed. */
export function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
        disabled={disabled}
        {...props}
      />
      {/* The name is screen-reader text, not aria-label, so the field stays
          the only thing labelled "Password". */}
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        aria-controls={props.id}
        onClick={() => setVisible((shown) => !shown)}
        disabled={disabled}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m4 4 16 16" />}
        </svg>
        <span className="sr-only">
          {visible ? "Hide password" : "Show password"}
        </span>
      </button>
    </div>
  );
}
