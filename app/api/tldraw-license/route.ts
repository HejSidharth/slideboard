import { NextResponse } from "next/server";

export async function GET() {
  const licenseKey = process.env.SLIDEBOARD_TLDRAW_LICENSE_KEY;

  if (!licenseKey) {
    return NextResponse.json({ licenseKey: null });
  }

  return NextResponse.json({ licenseKey });
}
