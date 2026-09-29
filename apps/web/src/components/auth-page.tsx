import type { ReactNode } from "react";
import { Lead, PageTitle } from "@pigxel/ui/components/typography";
import { Brand } from "./brand";

/** The narrow, centred layout of the sign-in and password pages. */
export function AuthPage({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-12">
        <Brand />
      </div>
      <PageTitle>{title}</PageTitle>
      <Lead className="mt-3 mb-8">{description}</Lead>
      {children}
    </main>
  );
}
