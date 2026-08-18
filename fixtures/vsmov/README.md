# VSMOV public API fixtures

Captured from unauthenticated JSON `GET` responses on 2026-08-10. These are
deterministic contract snapshots; tests do not contact VSMOV.

| Fixture | Public endpoint |
| --- | --- |
| `latest.json` | `https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1&limit=2` |
| `search.json` | `https://vsmov.com/api/tim-kiem?keyword=avengers&page=1&limit=2` |
| `genres.json` | `https://vsmov.com/api/the-loai` |
| `detail-cinema-embed.json` | `https://vsmov.com/api/phim/bay-xac-song-178486381421977` |

The latest endpoint returned its fixed 24-item page despite `limit=2`; that
behavior is deliberately retained. The detail snapshot contains the provider's
positive `chieurap: true` evidence and its public embed-player URL. It does not
contain a manufactured direct-stream URL.
