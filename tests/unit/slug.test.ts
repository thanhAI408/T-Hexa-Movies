import { describe, expect, it } from "vitest";

import { canonicalSlug, slugify } from "@/lib/slug";

describe("catalog slugs", () => {
  it("creates stable accent-free slugs", () => {
    expect(slugify("Đất Rừng Phương Nam")).toBe("dat-rung-phuong-nam");
    expect(slugify("  Ám Ảnh: Phần 2! ")).toBe("am-anh-season-2");
  });

  it("adds year and an optional collision suffix", () => {
    expect(canonicalSlug("Lightyear: Cảnh sát vũ trụ", 2022)).toBe(
      "lightyear-canh-sat-vu-tru-2022",
    );
    expect(canonicalSlug("Lightyear", 2022, "ophim-2")).toBe(
      "lightyear-2022-ophim-2",
    );
  });

  it("uses a safe fallback for an empty title", () => {
    expect(canonicalSlug("", null)).toBe("phim");
  });
});
