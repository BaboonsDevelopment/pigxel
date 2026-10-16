import { NextResponse, type NextRequest } from "next/server";
import {
  failed,
  guard,
  productionAssets,
} from "@/features/asset-review/server";

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await productionAssets());
  } catch (e) {
    return failed(e);
  }
}
