import { NextResponse, type NextRequest } from "next/server";
import { productionCatalog } from "@/features/asset-review/production";
import { failed, guard } from "@/features/asset-review/server";

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await productionCatalog());
  } catch (e) {
    return failed(e);
  }
}
