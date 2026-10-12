import type { NextRequest, NextResponse } from "next/server";
import { ACCEPT_COOKIE, LEGAL_VERSION } from "./legal";

const MAX_AGE_SECONDS = 15 * 60;

/**
 * Remembers, across the trip to Google or Apple, that someone ticked the
 * sign-up boxes, so the callback can record it for the new account.
 */
export function rememberAcceptance(
  request: NextRequest,
  response: NextResponse,
) {
  if (request.nextUrl.searchParams.get("accept") === LEGAL_VERSION)
    response.cookies.set(ACCEPT_COOKIE, LEGAL_VERSION, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/auth",
      maxAge: MAX_AGE_SECONDS,
    });
  return response;
}

/** Whether the sign-up boxes were ticked before this OAuth sign-in. */
export const acceptedBeforeOAuth = (request: NextRequest) =>
  request.cookies.get(ACCEPT_COOKIE)?.value === LEGAL_VERSION;

export function forgetAcceptance(response: NextResponse) {
  response.cookies.set(ACCEPT_COOKIE, "", { path: "/auth", maxAge: 0 });
  return response;
}
