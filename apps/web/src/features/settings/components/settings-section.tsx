import type { ReactNode } from "react";
import { SectionTitle } from "@pigxel/ui/components/typography";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b py-8 first-of-type:pt-0 last:border-b-0">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}
