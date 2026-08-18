import { z } from "zod";

const scalarSchema = z.union([z.string(), z.number()]);

const externalSourceSchema = z
  .object({
    type: z.string().nullable().optional(),
    id: scalarSchema.nullable().optional(),
    season: z.union([z.string(), z.number()]).nullable().optional(),
    vote_average: z.union([z.string(), z.number()]).nullable().optional(),
    vote_count: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();

const timestampSchema = z
  .object({
    time: z.string().nullable().optional(),
  })
  .passthrough();

export const vsmovTaxonomyItemSchema = z
  .object({
    id: scalarSchema.optional(),
    _id: scalarSchema.optional(),
    name: z.string(),
    slug: z.string(),
  })
  .passthrough();

export const vsmovMovieSummarySchema = z
  .object({
    _id: scalarSchema,
    name: z.string(),
    origin_name: z.string().nullable().optional(),
    slug: z.string(),
    poster_url: z.unknown().optional(),
    thumb_url: z.unknown().optional(),
    year: z.union([z.string(), z.number()]).nullable().optional(),
    tmdb: externalSourceSchema.nullable().optional(),
    imdb: externalSourceSchema.nullable().optional(),
    modified: timestampSchema.nullable().optional(),
  })
  .passthrough();

const paginationSchema = z
  .object({
    totalItems: z.union([z.string(), z.number()]),
    totalItemsPerPage: z.union([z.string(), z.number()]),
    currentPage: z.union([z.string(), z.number()]),
    totalPages: z.union([z.string(), z.number()]),
  })
  .passthrough();

export const vsmovListResponseSchema = z
  .object({
    status: z.boolean(),
    items: z.array(vsmovMovieSummarySchema),
    pagination: paginationSchema,
    // This field is present only on the latest endpoint and is stale on the
    // current service. Item image URLs are already absolute, so it is not used.
    pathImage: z.unknown().optional(),
  })
  .passthrough();

export const vsmovTaxonomyResponseSchema = z
  .object({
    status: z.union([z.literal("success"), z.boolean()]),
    message: z.string().nullable().optional(),
    data: z
      .object({
        items: z.array(vsmovTaxonomyItemSchema),
      })
      .passthrough(),
  })
  .passthrough();

const vsmovEpisodeItemSchema = z
  .object({
    name: z.union([z.string(), z.number()]),
    slug: z.union([z.string(), z.number()]).nullable().optional(),
    filename: z.union([z.string(), z.number()]).nullable().optional(),
    // Real VSMOV responses currently expose an HTML player URL only. Keep the
    // field unknown so an occasional malformed value drops one source instead
    // of invalidating an otherwise useful movie detail response.
    link_embed: z.unknown().optional(),
  })
  .passthrough();

const vsmovEpisodeServerSchema = z
  .object({
    server_name: z.unknown().optional(),
    server_data: z.array(vsmovEpisodeItemSchema),
  })
  .passthrough();

export const vsmovMovieDetailSchema = z
  .object({
    _id: scalarSchema,
    name: z.string(),
    origin_name: z.string().nullable().optional(),
    slug: z.string(),
    content: z.unknown().optional(),
    type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    poster_url: z.unknown().optional(),
    thumb_url: z.unknown().optional(),
    trailer_url: z.unknown().optional(),
    time: z.union([z.string(), z.number()]).nullable().optional(),
    episode_current: z.union([z.string(), z.number()]).nullable().optional(),
    episode_total: z.union([z.string(), z.number()]).nullable().optional(),
    quality: z.string().nullable().optional(),
    lang: z.string().nullable().optional(),
    notify: z.unknown().optional(),
    showtimes: z.unknown().optional(),
    year: z.union([z.string(), z.number()]).nullable().optional(),
    keywords: z.union([z.array(z.unknown()), z.string()]).nullable().optional(),
    view: z.union([z.string(), z.number()]).nullable().optional(),
    chieurap: z.boolean().nullable().optional(),
    sub_docquyen: z.boolean().nullable().optional(),
    actor: z.union([z.array(z.unknown()), z.string()]).nullable().optional(),
    director: z.union([z.array(z.unknown()), z.string()]).nullable().optional(),
    category: z.array(vsmovTaxonomyItemSchema).nullable().optional(),
    country: z.array(vsmovTaxonomyItemSchema).nullable().optional(),
    tmdb: externalSourceSchema.nullable().optional(),
    imdb: externalSourceSchema.nullable().optional(),
    created: timestampSchema.nullable().optional(),
    modified: timestampSchema.nullable().optional(),
  })
  .passthrough();

export const vsmovDetailResponseSchema = z
  .object({
    status: z.boolean(),
    msg: z.string().nullable().optional(),
    movie: vsmovMovieDetailSchema,
    episodes: z.array(vsmovEpisodeServerSchema).nullable().optional(),
  })
  .passthrough();

export type VsmovMovieSummary = z.infer<typeof vsmovMovieSummarySchema>;
export type VsmovListResponse = z.infer<typeof vsmovListResponseSchema>;
export type VsmovTaxonomyResponse = z.infer<typeof vsmovTaxonomyResponseSchema>;
export type VsmovMovieDetail = z.infer<typeof vsmovMovieDetailSchema>;
export type VsmovDetailResponse = z.infer<typeof vsmovDetailResponseSchema>;
