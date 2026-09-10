import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/all/route";
import { searchStoreCatalog } from "@/lib/stores/discover";
import { normalizeKkphimDetail, kkphimDetailResponseSchema } from "@/providers/kkphim";
import fixture from "../../fixtures/kkphim/detail-v1.json";
import { STORE_API_MAP } from "@/lib/stores/config";
import type { ProviderId, ProviderListResult } from "@/types/catalog";

vi.mock("@/lib/stores/discover", () => ({ searchStoreCatalog: vi.fn() }));
import { vidsrcProvider } from "@/providers/vidsrc";
import { vidlinkProvider } from "@/providers/vidlink";
vi.mock("@/providers/vidsrc", () => ({ vidsrcProvider: { search: vi.fn() } }));
vi.mock("@/providers/vidlink", () => ({ vidlinkProvider: { search: vi.fn() } }));
const intlSrc = vi.mocked(vidsrcProvider.search);
const intlLink = vi.mocked(vidlinkProvider.search);
beforeEach(() => {
  intlSrc.mockImplementation(async () => mock("vidsrc", "movie", 1, 24));
  intlLink.mockImplementation(async () => mock("vidlink", "movie", 1, 24));
});
const mock = vi.mocked(searchStoreCatalog);
function result(store: string): ProviderListResult {
  const movie = normalizeKkphimDetail(kkphimDetailResponseSchema.parse(fixture)).movie;
  return { items: [{ ...movie, provider: (STORE_API_MAP[store] || store) as ProviderId, providerSlug: "same-film" }], pagination: { currentPage: 1, totalItems: 1, totalPages: 1, itemsPerPage: 24 } };
}
describe("global search", () => {
  it("paginates VidLink independently and preserves movie/TV identities", async () => {
    const base = result("vidlink");
    intlLink.mockResolvedValue({ ...base, items: ["movie-123", "tv-123"].map(providerSlug => ({ ...base.items[0], providerSlug })) });
    const response = await GET(new Request("http://localhost/api/search/all?q=test&store=vidlink&page=2&limit=6"));
    expect(intlLink).toHaveBeenCalledExactlyOnceWith("test", 2, 6);
    expect(mock).not.toHaveBeenCalled();
    expect(intlSrc).not.toHaveBeenCalled();
    const { groups } = await response.json();
    expect(groups[0].storeName).toBe("VidLink");
    expect(groups[0].items.map((item: { href: string }) => item.href)).toEqual([
      "/stores/ban-mai/movie/vidlink~movie-123", "/stores/ban-mai/movie/vidlink~tv-123",
    ]);
  });
  it("queries all stores concurrently and preserves duplicate films across different sources", async () => {
    const pending: (() => void)[] = [];
    mock.mockImplementation(store => new Promise(resolve => pending.push(() => resolve(result(store)))));
    const response = GET(new Request("http://localhost/api/search/all?q=movie"));
    await vi.waitFor(() => expect(pending).toHaveLength(6));
    pending.forEach(resolve => resolve());
    const payload = await (await response).json();
    expect(payload.groups.map((group: { storeName: string }) => group.storeName)).toEqual(["Bình Minh", "Ban Mai", "Hoàng Hôn", "Dạ Nguyệt", "VidSrc", "VidLink"]);
    for (const group of payload.groups) expect(group.items[0].href).toBe(`/stores/${group.storeId.startsWith("vid") ? "ban-mai" : group.storeId}/movie/${group.provider}~same-film`);
    expect(new Set(payload.groups.map((group: { items: { id: string }[] }) => group.items[0].id)).size).toBe(6);
  });
  it("shows failures separately while retaining available stores", async () => {
    mock.mockImplementation(async store => { if (store === "ban-mai") throw new Error("offline"); return result(store); });
    const response = await GET(new Request("http://localhost/api/search/all?q=movie"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.partial).toBe(true);
    expect(payload.groups[1]).toMatchObject({ storeId: "ban-mai", status: "unavailable", items: [], pagination: null });
    expect(payload.groups[0].items).toHaveLength(1);
  });
  it("returns 503, not a successful empty result, when all sources fail", async () => {
    mock.mockRejectedValue(new Error("offline"));
    const response = await GET(new Request("http://localhost/api/search/all?q=movie"));
    expect(response.status).toBe(503);
    expect((await response.json()).groups).toHaveLength(6);
  });
  it("keeps successful empty searches distinct from outages", async () => {
    mock.mockImplementation(async store => ({ ...result(store), items: [], pagination: { ...result(store).pagination, totalItems: 0 } }));
    const response = await GET(new Request("http://localhost/api/search/all?q=unknown"));
    expect(response.status).toBe(200);
    expect((await response.json()).partial).toBe(false);
  });
  it("loads the next page from only the requested store", async () => {
    mock.mockImplementation(async store => result(store));
    await GET(new Request("http://localhost/api/search/all?q=test&store=hoang-hon&page=2&limit=24"));
    expect(mock).toHaveBeenCalledExactlyOnceWith("hoang-hon", "test", 2, 24);
  });
  it.each(["q=", "q=x&page=NaN", "q=x&page=0", "q=x&limit=1000", "q=x&store=unknown", `q=${"x".repeat(151)}`])("rejects invalid input %s", async query => {
    const response = await GET(new Request(`http://localhost/api/search/all?${query}`));
    expect(response.status).toBe(400);
    expect(mock).not.toHaveBeenCalled();
  });
});
