import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventPage } from "@/features/storefront/screens/EventPage";
import { listedShow } from "@/features/storefront/lib/content";
import { currentCustomer } from "@/features/storefront/lib/session";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const show = await listedShow((await params).id).catch(() => null);
  return { title: show?.title || "Show" };
}

export default async function Page({ params }: Props) {
  const show = await listedShow((await params).id);
  if (!show) notFound();
  const me = await currentCustomer();
  return <EventPage show={show} buyer={me ? { name: me.name, email: me.email } : null} />;
}
