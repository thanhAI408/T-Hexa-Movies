import { NextRequest, NextResponse } from "next/server";
import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { STORES, STORE_API_MAP } from "@/lib/stores/config";
import type { ProviderListKind, ProviderMovieInput } from "@/types/catalog";

// Map slug -> provider
const PROVIDER_MAP: Record<string, {
  getLatest: typeof vsmovProvider.getLatest;
  getList: typeof vsmovProvider.getList;
  search: typeof vsmovProvider.search
}> = {
  vsmov: vsmovProvider,
  ophim: ophimProvider,
  nguonc: nguoncProvider,
  kkphim: kkphimProvider,
};

// Valid store slugs (both old and new)
const VALID_STORES = [
  // New slugs
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  // Old slugs (for backward compatibility)
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];
const VALID_KINDS: ProviderListKind[] = ["latest", "single", "series", "animation", "tvshow", "cinema"];
const VALID_SORTS = ["updated", "year_desc", "year_asc", "title"];

type SortOption = "updated" | "year_desc" | "year_asc" | "title";

// Sort movies by specified criteria
function sortMovies(movies: ProviderMovieInput[], sort: SortOption): ProviderMovieInput[] {
  const sorted = [...movies];

  switch (sort) {
    case "year_desc":
      return sorted.sort((a, b) => {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        if (yearB !== yearA) return yearB - yearA;
        return new Date(b.providerUpdatedAt ?? 0).getTime() - new Date(a.providerUpdatedAt ?? 0).getTime();
      });

    case "year_asc":
      return sorted.sort((a, b) => {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        return yearA - yearB;
      });

    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "vi"));

    case "updated":
    default:
      return sorted.sort((a, b) => {
        const dateA = new Date(a.providerUpdatedAt ?? 0).getTime();
        const dateB = new Date(b.providerUpdatedAt ?? 0).getTime();
        return dateB - dateA;
      });
  }
}

// Group movies by year
interface MoviesByYear {
  [year: string]: ProviderMovieInput[];
}

function groupMoviesByYear(movies: ProviderMovieInput[]): MoviesByYear {
  const groups: MoviesByYear = {};

  movies.forEach((movie) => {
    const year = movie.year ? String(movie.year) : "Không rõ";
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(movie);
  });

  const sortedYears = Object.keys(groups).sort((a, b) => {
    if (a === "Không rõ") return 1;
    if (b === "Không rõ") return -1;
    return parseInt(b) - parseInt(a);
  });

  const result: MoviesByYear = {};
  sortedYears.forEach((year) => {
    result[year] = groups[year];
  });

  return result;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;

  if (!VALID_STORES.includes(storeId)) {
    return NextResponse.json(
      { error: "Invalid store ID" },
      { status: 400 }
    );
  }

  // Get API provider from store config
  const apiId = STORE_API_MAP[storeId] || storeId;
  const provider = PROVIDER_MAP[apiId];

  if (!provider) {
    return NextResponse.json(
      { error: "Store not found" },
      { status: 404 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
  const kind = (searchParams.get("kind") ?? "latest") as ProviderListKind;
  const query = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") ?? "updated") as SortOption;
  const groupByYear = searchParams.get("groupByYear") === "true";
  const validSort = VALID_SORTS.includes(sort) ? sort : "updated";

  try {
    if (query) {
      const result = await provider.search(query, page, limit);
      const sortedItems = sortMovies(result.items, validSort);
      return NextResponse.json({ ...result, items: sortedItems });
    }

    const validKind = VALID_KINDS.includes(kind) ? kind : "latest";
    const result = await provider.getList(validKind, page, limit);
    const sortedItems = sortMovies(result.items, validSort);

    if (groupByYear) {
      const grouped = groupMoviesByYear(sortedItems);
      return NextResponse.json({
        items: sortedItems,
        pagination: result.pagination,
        groupedByYear: grouped,
        years: Object.keys(grouped),
      });
    }

    return NextResponse.json({ ...result, items: sortedItems });
  } catch (error) {
    console.error(`[API] Store ${storeId} (${apiId}) error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}
