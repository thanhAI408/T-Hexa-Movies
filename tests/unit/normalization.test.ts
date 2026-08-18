import { describe, expect, it } from "vitest";

import {
  cleanText,
  normalizeTitle,
  safeStringArray,
} from "@/providers/shared/normalize";

describe("Vietnamese and title normalization", () => {
  it.each([
    ["Đất Rừng Phương Nam", "dat rung phuong nam"],
    ["Mùa Hè Của Hồ Ly", "mua he cua ho ly"],
    ["  Cô Gái Đến Từ Hôm Qua!!! ", "co gai den tu hom qua"],
    ["Ransom Canyon (Phần 2)", "ransom canyon season 2"],
    ["Ransom Canyon - Season 2", "ransom canyon season 2"],
    ["Ransom Canyon S2", "ransom canyon season 2"],
  ])("normalizes %s deterministically", (input, expected) => {
    expect(normalizeTitle(input)).toBe(expected);
  });

  it("returns an empty normalized title for missing data", () => {
    expect(normalizeTitle(null)).toBe("");
    expect(normalizeTitle(undefined)).toBe("");
  });

  it("removes untrusted markup and decodes common entities", () => {
    expect(
      cleanText(
        "<p>Buzz &amp; Woody</p><script>alert('x')</script><style>bad{}</style>",
      ),
    ).toBe("Buzz & Woody");
  });

  it("deduplicates sanitized string arrays", () => {
    expect(safeStringArray([" Việt Nam ", "Việt Nam", "", null, "Âu Mỹ"])).toEqual([
      "Việt Nam",
      "Âu Mỹ",
    ]);
  });
});
