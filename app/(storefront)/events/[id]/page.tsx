import { notFound } from "next/navigation";
import { keystoneContext } from "@/features/keystone/context";
import { EventBuy } from "@/features/storefront/screens/EventBuy";

export const dynamic = "force-dynamic";
const OPEN = ["announced", "presale", "on_sale", "sold_out", "postponed"];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await keystoneContext.prisma.event.findUnique({ where: { id }, select: { status: true } });
  if (!event || !event.status || !OPEN.includes(event.status)) notFound();
  return <EventBuy eventId={id} />;
}
