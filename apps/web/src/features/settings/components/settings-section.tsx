import type { ReactNode } from "react";
import { SectionTitle } from "@pigxel/ui/components/typography";

export function SettingsSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 border-b py-8 first-of-type:pt-0 last:border-b-0"
    >
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}
