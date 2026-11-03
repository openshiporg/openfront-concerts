import { EventBuy } from "@/features/storefront/screens/EventBuy";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventBuy eventId={id} />;
}
