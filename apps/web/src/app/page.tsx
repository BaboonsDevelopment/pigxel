import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@pigxel/ui/components/button";
import { Brand } from "@/components/brand";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    error?: string;
    type?: string;
    sb_flow_id?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.code) {
    const query = new URLSearchParams({ code: params.code });
    if (params.sb_flow_id) query.set("sb_flow_id", params.sb_flow_id);
    if (params.type === "recovery") query.set("next", "/auth/update-password");
    redirect(`/auth/callback?${query}`);
  }
  if (params.error) redirect("/login?error=confirmation");
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex h-24 items-center justify-between border-b">
        <Brand />
        <Link
          href="/login"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Log in <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center sm:py-28">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-600" />A little
          world in the making
        </span>
        <div
          aria-hidden="true"
          className="mb-8 grid size-16 grid-cols-3 gap-1.5 rotate-[-8deg]"
        >
          {[
            "bg-violet-200",
            "bg-violet-400",
            "bg-violet-200",
            "bg-violet-400",
            "bg-violet-600",
            "bg-violet-400",
            "bg-violet-200",
            "bg-violet-400",
            "bg-violet-200",
          ].map((color, i) => (
            <span key={i} className={`rounded-[3px] ${color}`} />
          ))}
        </div>
        <h1 className="max-w-2xl text-5xl leading-[1.08] font-semibold tracking-tight sm:text-7xl">
          Small pixels.
          <br />
          <span className="text-muted-foreground">Big imagination.</span>
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          A home for pixel art, with an AI helping hand. We’re building a
          simpler way to bring your little ideas to life.
        </p>
        <Link href="/login?mode=signup" className={`${buttonClassName} mt-8`}>
          Create an account <span aria-hidden="true">↗</span>
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          The creative tools are coming. Your account starts here.
        </p>
      </section>
      <footer className="flex flex-wrap justify-between gap-3 border-t py-6 text-xs text-muted-foreground">
        <span>Pigxel · Pixel by pixel.</span>
        <span>Made for the joy of creating.</span>
      </footer>
    </main>
  );
}
