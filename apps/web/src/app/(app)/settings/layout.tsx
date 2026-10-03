import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";
import { PageTitle } from "@pigxel/ui/components/typography";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Page width="narrow">
      <PageTitle>Settings</PageTitle>
      <SettingsTabs />
      <div className="pt-8">{children}</div>
    </Page>
  );
}
