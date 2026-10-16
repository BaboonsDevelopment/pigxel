import { AuthForm } from "./auth-form";
import { AppleLogo, GoogleLogo, ProviderButton } from "./provider-button";

/** Sign-up: pick Google, Apple or email. */
export function SignupChoices({
  googleHref,
  appleHref,
  configured,
  next,
}: {
  googleHref?: string;
  appleHref?: string;
  configured: boolean;
  next: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <ProviderButton href={googleHref} logo={<GoogleLogo />} name="Google" />
        <ProviderButton href={appleHref} logo={<AppleLogo />} name="Apple" />
      </div>
      <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <AuthForm mode="signup" configured={configured} next={next} />
    </>
  );
}
