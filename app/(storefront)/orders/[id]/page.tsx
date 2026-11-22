import { notFound } from "next/navigation";
import { keystoneContext } from "@/features/keystone/context";
import { OrderView } from "@/features/storefront/screens/OrderView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const order = await keystoneContext.prisma.ticketOrder.findUnique({ where: { id }, select: { id: true } });
  if (!order) notFound();
  return <OrderView orderId={id} signedLink={typeof t === "string" ? t : undefined} />;
}
