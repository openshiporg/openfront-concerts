import { notFound } from "next/navigation";
import { keystoneContext } from "@/features/keystone/context";
import { OrderView } from "@/features/storefront/screens/OrderView";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await keystoneContext.prisma.ticketOrder.findUnique({ where: { id }, select: { id: true } });
  if (!order) notFound();
  return <OrderView orderId={id} />;
}
