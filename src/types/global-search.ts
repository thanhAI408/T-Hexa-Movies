import type { Pagination } from "./catalog";

export interface GlobalSearchMovie {
  id: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterUrl: string | null;
  quality: string | null;
  storeId: string;
  storeName: string;
  href: string;
}
export interface StoreSearchGroup {
  storeId: string;
  storeName: string;
  provider: string;
  status: "available" | "unavailable";
  items: GlobalSearchMovie[];
  pagination: Pagination | null;
}
export interface GlobalSearchResult {
  query: string;
  groups: StoreSearchGroup[];
  partial: boolean;
}
