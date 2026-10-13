import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

/** Renders into jsdom with a user-event session for realistic typing and clicks. */
export function renderWithUser(ui: ReactElement, options?: RenderOptions) {
  return { user: userEvent.setup(), ...render(ui, options) };
}

/**
 * Renders an async Server Component (a page or layout) by awaiting it first.
 * Works when everything it returns renders synchronously; nested async
 * components need the end-to-end tests instead.
 */
export async function renderServerComponent<P>(
  Component: (props: P) => Promise<ReactElement>,
  props: P,
) {
  return renderWithUser(await Component(props));
}
