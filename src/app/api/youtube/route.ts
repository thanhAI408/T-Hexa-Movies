import { z } from "zod";
import {
  MUSIC_GENRES,
  musicGenre,
  musicQuery,
  rankMusic,
  matchesMusicGenre,
} from "@/lib/youtube/music";
import type { YoutubeResult, YoutubeVideo } from "@/lib/youtube/types";

const schema = z.object({
  mode: z
    .enum(["popular", "search", "video", "channel", "comments", "music"])
    .default("popular"),
  q: z.string().trim().max(150).default(""),
  id: z
    .string()
    .regex(/^[\w-]{11}$/)
    .optional(),
  channel: z
    .string()
    .regex(/^UC[\w-]{22}$/)
    .optional(),
  page: z
    .string()
    .regex(/^[\w=-]{1,300}$/)
    .optional(),
  category: z
    .string()
    .regex(/^(?:0|[1-9][0-9]?)$/)
    .default("0"),
  order: z.enum(["relevance", "date", "viewCount", "hot"]).default("relevance"),
  music: z.enum(MUSIC_GENRES.map((genre) => genre.id)).default("all"),
  exclude: z
    .string()
    .regex(/^[\w-]{11}$/)
    .optional(),
  duration: z.enum(["any", "short", "medium", "long"]).default("any"),
});
const snippet = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  channelId: z.string().default(""),
  categoryId: z.string().optional(),
  defaultAudioLanguage: z.string().optional(),
  defaultLanguage: z.string().optional(),
  channelTitle: z.string().default(""),
  publishedAt: z.string().default(""),
  thumbnails: z.record(z.string(), z.object({ url: z.string() })).default({}),
});
const row = z.object({
  id: z.union([z.string(), z.object({ videoId: z.string().optional() })]),
  snippet,
  statistics: z
    .object({
      viewCount: z.string().optional(),
      subscriberCount: z.string().optional(),
      videoCount: z.string().optional(),
    })
    .optional(),
  contentDetails: z
    .object({
      duration: z.string().optional(),
      relatedPlaylists: z.object({ uploads: z.string() }).optional(),
    })
    .optional(),
  brandingSettings: z
    .object({
      image: z.object({ bannerExternalUrl: z.string().optional() }).optional(),
    })
    .optional(),
});
const list = z.object({
  items: z.array(row),
  nextPageToken: z.string().optional(),
});
class UpstreamError extends Error {
  constructor(public status: number) {
    super("YouTube request failed");
  }
}
function thumbnail(s: z.infer<typeof snippet>) {
  return (
    s.thumbnails.high?.url ||
    s.thumbnails.medium?.url ||
    s.thumbnails.default?.url ||
    ""
  );
}
function normalize(item: z.infer<typeof row>): YoutubeVideo {
  return {
    id: typeof item.id === "string" ? item.id : item.id.videoId || "",
    ...item.snippet,
    thumbnail: thumbnail(item.snippet),
    views: item.statistics?.viewCount,
    duration: item.contentDetails?.duration,
  };
}
export async function GET(request: Request) {
  const parsed = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Yêu cầu YouTube không hợp lệ." },
      { status: 400 },
    );
  const p = parsed.data;
  if (
    (["video", "comments"].includes(p.mode) && !p.id) ||
    (p.mode === "channel" && !p.channel) ||
    (p.mode === "search" && !p.q)
  )
    return Response.json(
      { error: "Thiếu từ khóa hoặc mã video/kênh." },
      { status: 400 },
    );
  const key = process.env.YOUTUBE_API_KEY;
  if (!key)
    return Response.json(
      {
        error:
          "Danh mục YouTube chưa được kết nối. Bạn vẫn có thể dán liên kết YouTube vào ô tìm kiếm để xem video.",
        code: "NOT_CONFIGURED",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  async function api(endpoint: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, key: key! });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/${endpoint}?${query}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } },
    );
    if (!response.ok) throw new UpstreamError(response.status);
    return response.json();
  }
  try {
    const page: Record<string, string> = p.page ? { pageToken: p.page } : {};
    let result: YoutubeResult;
    if (p.mode === "comments") {
      const data = z
        .object({
          nextPageToken: z.string().optional(),
          items: z.array(
            z.object({
              id: z.string(),
              snippet: z.object({
                topLevelComment: z.object({
                  snippet: z.object({
                    authorDisplayName: z.string(),
                    textDisplay: z.string(),
                    likeCount: z.number(),
                  }),
                }),
              }),
            }),
          ),
        })
        .parse(
          await api("commentThreads", {
            part: "snippet",
            videoId: p.id!,
            maxResults: "20",
            textFormat: "plainText",
            ...page,
          }),
        );
      result = {
        items: [],
        nextPageToken: data.nextPageToken,
        comments: data.items.map((item) => ({
          id: item.id,
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          text: item.snippet.topLevelComment.snippet.textDisplay,
          likes: item.snippet.topLevelComment.snippet.likeCount,
        })),
      };
    } else if (p.mode === "video") {
      const data = list.parse(
        await api("videos", {
          part: "snippet,statistics,contentDetails",
          id: p.id!,
        }),
      );
      result = { items: data.items.map(normalize) };
    } else if (p.mode === "music") {
      const genre = musicGenre(p.music);
      const chart =
        genre.id === "all" &&
        !p.q &&
        p.duration === "any" &&
        ["hot", "relevance"].includes(p.order);
      let videos: YoutubeVideo[];
      let nextPageToken: string | undefined;
      if (chart) {
        const data = list.parse(
          await api("videos", {
            part: "snippet,statistics,contentDetails",
            chart: "mostPopular",
            videoCategoryId: "10",
            regionCode: "VN",
            maxResults: "50",
            ...page,
          }),
        );
        videos = data.items.map(normalize);
        nextPageToken = data.nextPageToken;
      } else {
        // A daily cutoff keeps the shared upstream cache effective across listeners.
        const cutoff =
          new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) +
          "T00:00:00Z";
        const data = list.parse(
          await api("search", {
            part: "snippet",
            type: "video",
            maxResults: "50",
            videoCategoryId: "10",
            videoEmbeddable: "true",
            videoSyndicated: "true",
            q: musicQuery(genre.id, p.q),
            // First retrieve relevant recent songs; rank their momentum below.
            order: p.order === "hot" ? "relevance" : p.order,
            videoDuration: p.duration,
            regionCode: "VN",
            relevanceLanguage: genre.language,
            ...(p.order === "hot" ? { publishedAfter: cutoff } : {}),
            ...page,
          }),
        );
        const ids = data.items
          .map(normalize)
          .map((video) => video.id)
          .filter((id) => /^[\w-]{11}$/.test(id));
        const details = ids.length
          ? list
              .parse(
                await api("videos", {
                  part: "snippet,statistics,contentDetails",
                  id: ids.join(","),
                }),
              )
              .items.map(normalize)
          : [];
        const byId = new Map(details.map((video) => [video.id, video]));
        videos = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
        nextPageToken = data.nextPageToken;
      }
      result = {
        items: rankMusic(
          videos.filter((video) => matchesMusicGenre(video, genre.id)),
          p.order,
        ).filter((video) => video.id !== p.exclude),
        nextPageToken,
      };
    } else if (p.mode === "popular") {
      const data = list.parse(
        await api("videos", {
          part: "snippet,statistics,contentDetails",
          chart: "mostPopular",
          regionCode: "VN",
          maxResults: "50",
          ...(p.category !== "0" ? { videoCategoryId: p.category } : {}),
          ...page,
        }),
      );
      result = {
        items: data.items.map(normalize),
        nextPageToken: data.nextPageToken,
      };
    } else if (p.mode === "channel") {
      const channel = list.parse(
        await api("channels", {
          part: "snippet,statistics,contentDetails,brandingSettings",
          id: p.channel!,
        }),
      ).items[0];
      result = { items: [] };
      if (channel) {
        result.channel = {
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnail: thumbnail(channel.snippet),
          subscribers: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          banner: channel.brandingSettings?.image?.bannerExternalUrl,
        };
        const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
        if (uploads) {
          const data = z
            .object({
              items: z.array(
                z.object({ contentDetails: z.object({ videoId: z.string() }) }),
              ),
              nextPageToken: z.string().optional(),
            })
            .parse(
              await api("playlistItems", {
                part: "contentDetails",
                playlistId: uploads,
                maxResults: "24",
                ...page,
              }),
            );
          const ids = data.items.map((item) => item.contentDetails.videoId);
          const videos = ids.length
            ? list
                .parse(
                  await api("videos", {
                    part: "snippet,statistics,contentDetails",
                    id: ids.join(","),
                  }),
                )
                .items.map(normalize)
            : [];
          result.items = ids.flatMap((id) =>
            videos.filter((video) => video.id === id),
          );
          result.nextPageToken = data.nextPageToken;
        }
      }
    } else {
      const data = list.parse(
        await api("search", {
          part: "snippet",
          type: "video",
          maxResults: "24",
          videoEmbeddable: "true",
          videoSyndicated: "true",
          q: p.q,
          ...(p.category !== "0" ? {videoCategoryId:p.category} : {}),
          order: p.order === "hot" ? "viewCount" : p.order,
          videoDuration: p.duration,
          relevanceLanguage: "vi",
          ...page,
        }),
      );
      result = {
        items: data.items
          .map(normalize)
          .filter((video) => /^[\w-]{11}$/.test(video.id)),
        nextPageToken: data.nextPageToken,
      };
      if (result.items.length) {
        const details = list
          .parse(
            await api("videos", {
              part: "snippet,statistics,contentDetails",
              id: result.items.map((video) => video.id).join(","),
            }),
          )
          .items.map(normalize);
        result.items = result.items.flatMap((video) =>
          details.filter((detail) => detail.id === video.id),
        );
      }
    }
    // Channel artwork is optional: an artwork failure must not prevent playback or discovery.
    if (result.items.length) {
      try {
        const ids = [
          ...new Set(
            result.items
              .map((video) => video.channelId)
              .filter((id) => /^UC[\w-]{22}$/.test(id)),
          ),
        ];
        const channels = ids.length
          ? list.parse(
              await api("channels", { part: "snippet", id: ids.join(",") }),
            ).items
          : [];
        result.items = result.items.map((video) => ({
          ...video,
          channelThumbnail: channels.find(
            (channel) => channel.id === video.channelId,
          )
            ? thumbnail(
                channels.find((channel) => channel.id === video.channelId)!
                  .snippet,
              )
            : undefined,
        }));
      } catch {
        /* Keep the video list usable when optional artwork is unavailable. */
      }
    }
    return Response.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const unavailable = error instanceof UpstreamError && error.status === 403;
    return Response.json(
      {
        error:
          p.mode === "comments"
            ? "Không thể tải bình luận. Video có thể đã tắt bình luận."
            : unavailable
              ? "YouTube đang giới hạn truy cập hoặc cấu hình API chưa hợp lệ. Vui lòng thử lại sau."
              : "Chưa thể kết nối YouTube. Vui lòng thử lại.",
        code: "UPSTREAM_UNAVAILABLE",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
