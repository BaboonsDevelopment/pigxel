import { ViewTransition, type ReactNode } from "react";

/**
 * Fades a page in as it arrives and out as it leaves, wherever the visit
 * comes from: navigations are transitions in the App Router, so React runs
 * this through the browser's View Transitions API. The public header and
 * the app sidebar are named elsewhere and stay put; the styles live in
 * app/transitions.css. Browsers without the API just swap the page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
