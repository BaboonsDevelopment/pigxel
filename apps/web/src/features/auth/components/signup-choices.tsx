"use client";

import { useState } from "react";
import {
  ConsentChecks,
  consented,
  type Consent,
} from "@/features/legal/components/consent-checks";
import { LEGAL_VERSION } from "@/features/legal/legal";
import { AuthForm } from "./auth-form";
import { AppleLogo, GoogleLogo, ProviderButton } from "./provider-button";

const withAccept = (href: string | undefined) =>
  href &&
  `${href}${href.includes("?") ? "&" : "?"}accept=${encodeURIComponent(LEGAL_VERSION)}`;

/** Sign-up: tick the boxes, then pick Google, Apple or email. */
export function SignupChoices({
  googleHref,
  googleHint,
  appleHref,
  configured,
  next,
}: {
  googleHref?: string;
  googleHint?: string;
  appleHref?: string;
  configured: boolean;
  next: string;
}) {
  const [consent, setConsent] = useState<Consent>({ age: false, terms: false });
  const blocked = consented(consent) ? undefined : "tick both boxes first";
  return (
    <>
      <ConsentChecks value={consent} onChange={setConsent} />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <ProviderButton
          href={withAccept(googleHref)}
          logo={<GoogleLogo />}
          name="Google"
          hint={googleHint}
          blocked={blocked}
        />
        <ProviderButton
          href={withAccept(appleHref)}
          logo={<AppleLogo />}
          name="Apple"
          blocked={blocked}
        />
      </div>
      <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <AuthForm
        mode="signup"
        configured={configured}
        next={next}
        consent={consent}
      />
    </>
  );
}
