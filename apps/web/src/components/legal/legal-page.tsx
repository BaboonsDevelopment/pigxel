import type { ReactNode } from "react";
import { Notice } from "@pigxel/ui/components/notice";
import { LEGAL, legalDate } from "@/lib/legal";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated {legalDate(LEGAL.updated)}
      </p>
      {LEGAL.draft && (
        <Notice className="mt-6">
          This page is a draft and is still being reviewed. Details in brackets
          will be filled in before Pigxel takes payments.
        </Notice>
      )}
      <div className="mt-8 text-[15px] leading-relaxed">{intro}</div>
      <div className="mt-6 space-y-10 text-[15px] leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function ContactDetails() {
  return (
    <p>
      {LEGAL.operator}, {LEGAL.address}. Email:{" "}
      <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
    </p>
  );
}
