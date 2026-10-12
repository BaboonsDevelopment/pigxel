# Log in, sign up, password (`/login`, `/auth/update-password`)

Getting into an account, and recovering it.

**Who can open it:** everyone. Signed-in people are sent on: to Home, or to the page they were going to.

## Log in and sign up (`/login`)

- ✅ Three modes: log in (default), sign up (`?mode=signup`), forgot password (`?mode=forgot`).
- ✅ Email and password, with clear errors (wrong password, account exists, too many attempts, weak password).
- ✅ Sign up signs you in straight away (no email confirmation step).
- ✅ Continue with Google (also connects Google Drive when available) and Apple. A provider that isn't set up shows as unavailable.
- ✅ Switch between log in and sign up without losing where you were going.
- ✅ Returns to the page you came from after signing in (`?next=`, for example Pricing or an artist profile). Only known pages are allowed, so links can't send people to other sites.
- ✅ Forgot password: sends a reset link without revealing whether the account exists.
- ✅ Links to Terms of Service and Privacy Policy.
- ✅ Error messages for a cancelled Google/Apple sign-in and expired reset links.

## Set a new password (`/auth/update-password`)

- ✅ Opens only with a valid session (from the reset email, or from Account settings).
- ✅ New password and confirmation, 8–128 characters, must match and differ from the current one.
- ✅ Expired links go back to "forgot password" with an explanation.
- ✅ After saving, returns to Account settings with a confirmation.

## Planned and open

- ❓ Magic-link (passwordless) sign-in.
- ❓ Email confirmation on sign-up (needs SMTP set up for production).
