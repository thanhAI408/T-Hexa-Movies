import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import fixture from "../../fixtures/kkphim/list-v1.json";
import { discoverMovies, discoverQuerySchema, buildCatalogUrl } from "@/lib/stores/discover";
import { GET } from "@/app/api/stores/[storeId]/discover/route";
import { getMovieDetail } from "@/lib/stores/actions";
import { kkphimProvider } from "@/providers/kkphim";
import { ophimProvider } from "@/providers/ophim";

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
function page(items: object[], currentPage = 1, totalItems = items.length, perPage = 24) {
  return { ...fixture, data: { ...fixture.data, items, params: { pagination: { currentPage, totalItems, totalItemsPerPage: perPage, totalPages: Math.max(1, Math.ceil(totalItems / perPage)) } } } };
}
const movie = fixture.data.items[0];

describe("production discovery regressions", () => {
  it("combines format, genre, country, year and ascending year sorting upstream", () => {
    const url = new URL(buildCatalogUrl("https://phimapi.com", discoverQuerySchema.parse({ kind: "series", genre: "hanh-dong", country: "han-quoc", year: "2024", sort: "year_asc", page: 2 })));
    expect(url.pathname).toBe("/v1/api/danh-sach/phim-bo");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ category: "hanh-dong", country: "han-quoc", year: "2024", sort_field: "year", sort_type: "asc", page: "2" });
  });
  it("preserves every filter and source identity when OPhim fails", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.hostname === "ophim1.com") return new Response("not found", { status: 404 });
      expect(url.pathname).toBe("/v1/api/danh-sach/phim-bo");
      expect(url.searchParams.get("country")).toBe("han-quoc");
      return json(page([movie]));
    });
    vi.stubGlobal("fetch", fetcher);
    const result = await discoverMovies("ban-mai", discoverQuerySchema.parse({ kind: "series", country: "han-quoc" }));
    expect(result.provider).toBe("kkphim");
    expect(result.notice).toBeTruthy();
    expect(result.items[0].providerSlug).toBe(`kkphim~${movie.slug}`);
  });
  it("keeps valid empty results instead of substituting unrelated movies", async () => {
    const fetcher = vi.fn(async () => json(page([])));
    vi.stubGlobal("fetch", fetcher);
    const result = await discoverMovies("da-nguyet", discoverQuerySchema.parse({ q: "no-such-movie" }));
    expect(result.items).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("filters complete search results by format before paginating", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      const number = Number(new URL(String(input)).searchParams.get("page"));
      return json(page(number === 1 ? [{ ...movie, slug: "single", type: "single" }] : [{ ...movie, slug: "series", type: "series" }], number, 65, 64));
    }));
    const result = await discoverMovies("da-nguyet", discoverQuerySchema.parse({ q: "canh", kind: "series", limit: 1 }));
    expect(result.items.map(item => item.providerSlug)).toEqual(["kkphim~series"]);
    expect(result.pagination).toMatchObject({ totalItems: 1, totalPages: 1 });
  });
  it("does not repeat page one when upstream clamps an out-of-range page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(page([movie]))));
    const result = await discoverMovies("da-nguyet", discoverQuerySchema.parse({ page: 99 }));
    expect(result.items).toEqual([]);
  });
  it.each(["NaN", "-1", "1.2", "Infinity"])("rejects invalid page %s without calling upstream", async value => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(new NextRequest(`http://localhost/api/stores/ban-mai/discover?page=${value}`), { params: Promise.resolve({ storeId: "ban-mai" }) });
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("opens qualified movie references in exactly their originating provider", async () => {
    const primary = vi.spyOn(ophimProvider, "getMovie");
    const source = vi.spyOn(kkphimProvider, "getMovie").mockResolvedValue(null);
    expect(await getMovieDetail("ban-mai", "kkphim~same-slug")).toBeNull();
    expect(source).toHaveBeenCalledWith("same-slug");
    expect(primary).not.toHaveBeenCalled();
  });
});
