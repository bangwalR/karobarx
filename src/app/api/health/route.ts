import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "karobarx-crm",
    timestamp: new Date().toISOString(),
  });
}
