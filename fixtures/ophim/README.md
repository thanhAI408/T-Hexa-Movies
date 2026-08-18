# OPhim fixtures

These fixtures are trimmed, deterministic samples captured from OPhim's public
JSON API on 2026-08-10. Large SEO blocks and additional list items were removed;
the provider response envelopes and representative movie/source fields are kept.

Sources:

- `list-v1.json`: `/v1/api/danh-sach/phim-bo?page=1&limit=1`
- `list-legacy.json`: `/danh-sach/phim-moi-cap-nhat?page=1`
- `search.json`: `/v1/api/tim-kiem?keyword=lightyear&page=1&limit=1`
- `cinema.json`: `/v1/api/danh-sach/phim-chieu-rap?page=1&limit=1`
- `genres.json`: `/v1/api/the-loai`
- `countries.json`: `/quoc-gia` (legacy fallback after a live v1 timeout)
- `years.json`: `/nam-phat-hanh`
- `detail-v1.json`: `/v1/api/phim/lightyear-canh-sat-vu-tru`
- `detail-legacy.json`: `/phim/lightyear-canh-sat-vu-tru`
- `detail-empty-source.json`: `/phim/soulm8te`

The URLs are evidence of provider shape, not a promise that a third-party stream
host remains playable. Live playback health is checked separately at use time.
