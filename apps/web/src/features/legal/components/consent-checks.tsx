"use client";

import Link from "next/link";
import { Checkbox } from "@pigxel/ui/components/choice";
import { LEGAL } from "../legal";

export type Consent = { age: boolean; terms: boolean };

export const consented = (consent: Consent) => consent.age && consent.terms;

/**
 * The two boxes people tick to create an account or keep using Pigxel. They
 * start unticked, and post as `age` and `terms` when inside a form.
 */
export function ConsentChecks({
  value,
  onChange,
  disabled,
}: {
  value: Consent;
  onChange: (value: Consent) => void;
  disabled?: boolean;
}) {
  const link = "underline underline-offset-2 hover:text-foreground";
  return (
    <fieldset className="space-y-2.5 text-sm" disabled={disabled}>
      <legend className="sr-only">Before you continue</legend>
      <label className="flex items-start gap-2.5">
        <Checkbox
          name="age"
          className="mt-0.5"
          checked={value.age}
          onChange={(e) => onChange({ ...value, age: e.target.checked })}
          required
        />
        <span>I’m at least {LEGAL.minAge} years old.</span>
      </label>
      <label className="flex items-start gap-2.5">
        <Checkbox
          name="terms"
          className="mt-0.5"
          checked={value.terms}
          onChange={(e) => onChange({ ...value, terms: e.target.checked })}
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className={link}>
            Terms of Service
          </Link>{" "}
          and have read the{" "}
          <Link href="/privacy" target="_blank" className={link}>
            Privacy Policy
          </Link>
          .
        </span>
      </label>
    </fieldset>
  );
}
