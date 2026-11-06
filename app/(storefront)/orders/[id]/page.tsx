import { OrderView } from "@/features/storefront/screens/OrderView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderView orderId={id} />;
}
