import type { TaxonomyItem } from "@/types/catalog";

function taxonomy(prefix: string, entries: ReadonlyArray<readonly [string, string]>) {
  return entries.map(([slug, name]) => ({ id: `${prefix}-${slug}`, name, slug }));
}

export const NGUONC_GENRES: ReadonlyArray<TaxonomyItem> = taxonomy("nguonc-genre", [
  ["bi-an", "Bí Ẩn"],
  ["chien-tranh", "Chiến Tranh"],
  ["chinh-kich", "Chính Kịch"],
  ["co-trang", "Cổ Trang"],
  ["gay-can", "Gây Cấn"],
  ["gia-dinh", "Gia Đình"],
  ["gia-tuong", "Giả Tưởng"],
  ["hanh-dong", "Hành Động"],
  ["hinh-su", "Hình Sự"],
  ["hoat-hinh", "Hoạt Hình"],
  ["khoa-hoc-vien-tuong", "Khoa Học Viễn Tưởng"],
  ["kinh-di", "Kinh Dị"],
  ["lang-man", "Lãng Mạn"],
  ["lich-su", "Lịch Sử"],
  ["mien-tay", "Miền Tây"],
  ["phieu-luu", "Phiêu Lưu"],
  ["phim-18", "Phim 18+"],
  ["phim-hai", "Hài"],
  ["phim-nhac", "Nhạc"],
  ["tai-lieu", "Tài Liệu"],
  ["tam-ly", "Tâm Lý"],
  ["tinh-cam", "Tình Cảm"],
]);

export const NGUONC_COUNTRIES: ReadonlyArray<TaxonomyItem> = taxonomy(
  "nguonc-country",
  [
    ["an-do", "Ấn Độ"],
    ["anh", "Anh"],
    ["au-my", "Âu Mỹ"],
    ["dai-loan", "Đài Loan"],
    ["ha-lan", "Hà Lan"],
    ["han-quoc", "Hàn Quốc"],
    ["hong-kong", "Hồng Kông"],
    ["indonesia", "Indonesia"],
    ["nga", "Nga"],
    ["nhat-ban", "Nhật Bản"],
    ["phap", "Pháp"],
    ["philippines", "Philippines"],
    ["quoc-gia-khac", "Quốc gia khác"],
    ["thai-lan", "Thái Lan"],
    ["trung-quoc", "Trung Quốc"],
    ["viet-nam", "Việt Nam"],
  ],
);

// NguonC does not publish taxonomy enumeration endpoints. These are the years
// exposed by its official API documentation/navigation at implementation time.
export const NGUONC_YEARS = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
] as const;

export function cloneTaxonomy(items: ReadonlyArray<TaxonomyItem>): TaxonomyItem[] {
  return items.map((item) => ({ ...item }));
}
