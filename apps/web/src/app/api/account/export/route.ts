import { getUser } from "@/lib/auth/session";
import { exportAccount } from "@/features/settings/account/export";

export const maxDuration = 60;

export async function GET() {
  const user = await getUser();
  if (!user)
    return new Response("Sign in to download your data.", { status: 401 });
  try {
    const zip = await exportAccount(user);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(zip as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="pigxel-data-${day}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Couldn’t export account:", error);
    return new Response("We couldn’t prepare your data. Please try again.", {
      status: 500,
    });
  }
}
