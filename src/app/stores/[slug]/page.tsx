import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { STORES } from "@/lib/stores/config";
import { StoreProvider } from "@/components/stores/theme-provider";
import { StoreHero } from "@/components/stores/store-hero";
import { StoreExplorer } from "@/components/stores/store-explorer";
import { StoreHeader } from "@/components/stores/store-header";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = STORES[slug];
  if (!store) return { title: "Không tìm thấy" };

  return {
    title: `${store.name} - ${store.description}`,
    description: store.description,
  };
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const store = STORES[slug];

  if (!store) {
    notFound();
  }

  return (
    <StoreProvider store={store}>
      {/* Header */}
      <StoreHeader store={store} />

      {/* Hero - Fetches real featured movie */}
      <StoreHero store={store} />

      {/* Store Explorer - Full featured movie browsing */}
      <div className="page-shell py-8 pb-20">
        <StoreExplorer store={store} />
      </div>
    </StoreProvider>
  );
}
