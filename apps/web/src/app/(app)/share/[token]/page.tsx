import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { loginUrl } from "@/lib/auth/routes";
import { getUser } from "@/lib/auth/session";
import { OpenSharedProject } from "@/features/sharing/components/open-shared-project";
import { joinByLink } from "@/features/sharing/server";
import { shareLinkPath } from "@/features/sharing/sharing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared project · Pigxel",
  robots: { index: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const user = await getUser();
  if (!user) redirect(loginUrl("login", shareLinkPath(token)));
  const tile = await joinByLink(token);
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      {tile ? (
        <OpenSharedProject userId={user.id} tile={tile} />
      ) : (
        <EmptyState
          title="This link doesn’t work"
          description="The owner may have reset it or turned it off. Ask them for a new one."
          action={
            <Link
              href="/tiles"
              className={buttonVariants({ variant: "secondary" })}
            >
              Go to My projects
            </Link>
          }
        />
      )}
    </main>
  );
}
