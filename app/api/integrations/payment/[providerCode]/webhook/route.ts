import { NextRequest, NextResponse } from "next/server";
import { keystoneContext } from "@/features/keystone/context";
import { handleProviderWebhook } from "@/features/keystone/mutations/checkout";

export async function POST(request: NextRequest, { params }: { params: Promise<{ providerCode: string }> }) {
  const { providerCode } = await params;
  const rawBody = await request.text();
  try {
    const result = await handleProviderWebhook(keystoneContext, providerCode, rawBody, Object.fromEntries(request.headers.entries()));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 400 });
  }
}
