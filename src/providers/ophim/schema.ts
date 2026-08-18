import { z } from "zod";

const successStatusSchema = z.union([z.literal(true), z.literal("success")]);
const scalarSchema = z.union([z.string(), z.number()]);
const nullableScalarSchema = scalarSchema.nullish();

const externalIdSchema = z
  .object({
    id: nullableScalarSchema,
  })
  .passthrough()
  .nullish();

const modifiedSchema = z
  .object({
    time: z.string().nullish(),
  })
  .passthrough()
  .nullish();

export const ophimTaxonomyItemSchema = z
  .object({
    _id: nullableScalarSchema,
    id: nullableScalarSchema,
    name: z.string().nullish(),
    slug: z.string().nullish(),
    year: scalarSchema.nullish(),
  })
  .passthrough();

export const ophimEpisodeSourceSchema = z
  .object({
    name: z.unknown().optional(),
    slug: z.unknown().optional(),
    filename: z.unknown().optional(),
    link_embed: z.unknown().optional(),
    link_m3u8: z.unknown().optional(),
  })
  .passthrough();

export const ophimEpisodeServerSchema = z
  .object({
    server_name: z.unknown().optional(),
    is_ai: z.unknown().optional(),
    server_data: z.array(ophimEpisodeSourceSchema).nullish(),
  })
  .passthrough();

export const ophimMovieSchema = z
  .object({
    _id: nullableScalarSchema,
    name: z.unknown().optional(),
    slug: z.unknown().optional(),
    origin_name: z.unknown().optional(),
    alternative_names: z.unknown().optional(),
    content: z.unknown().optional(),
    type: z.unknown().optional(),
    status: z.unknown().optional(),
    thumb_url: z.unknown().optional(),
    poster_url: z.unknown().optional(),
    chieurap: z.unknown().optional(),
    time: z.unknown().optional(),
    episode_current: z.unknown().optional(),
    episode_total: z.unknown().optional(),
    quality: z.unknown().optional(),
    lang: z.unknown().optional(),
    year: z.unknown().optional(),
    actor: z.unknown().optional(),
    director: z.unknown().optional(),
    category: z.array(ophimTaxonomyItemSchema).nullish(),
    country: z.array(ophimTaxonomyItemSchema).nullish(),
    tmdb: externalIdSchema,
    imdb: externalIdSchema,
    modified: modifiedSchema,
    episodes: z.array(ophimEpisodeServerSchema).nullish(),
  })
  .passthrough();

const paginationSchema = z
  .object({
    totalItems: scalarSchema,
    totalItemsPerPage: scalarSchema,
    currentPage: scalarSchema,
    totalPages: scalarSchema.nullish(),
    pageRanges: scalarSchema.nullish(),
  })
  .passthrough();

export const ophimV1ListResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    data: z
      .object({
        items: z.array(ophimMovieSchema),
        params: z
          .object({
            pagination: paginationSchema,
          })
          .passthrough(),
        APP_DOMAIN_FRONTEND: z.string().nullish(),
        APP_DOMAIN_CDN_IMAGE: z.string().nullish(),
      })
      .passthrough(),
  })
  .passthrough();

export const ophimLegacyListResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    items: z.array(ophimMovieSchema),
    pagination: paginationSchema,
    pathImage: z.string().nullish(),
  })
  .passthrough();

export const ophimListResponseSchema = z.union([
  ophimV1ListResponseSchema,
  ophimLegacyListResponseSchema,
]);

export const ophimTaxonomyResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    data: z
      .object({
        items: z.array(ophimTaxonomyItemSchema),
      })
      .passthrough(),
  })
  .passthrough();

export const ophimLegacyDetailResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    movie: ophimMovieSchema,
    episodes: z.array(ophimEpisodeServerSchema).nullish(),
    pathImage: z.string().nullish(),
  })
  .passthrough();

export const ophimV1DetailResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    data: z
      .object({
        item: ophimMovieSchema,
        APP_DOMAIN_CDN_IMAGE: z.string().nullish(),
      })
      .passthrough(),
  })
  .passthrough();

export const ophimDetailResponseSchema = z.union([
  ophimV1DetailResponseSchema,
  ophimLegacyDetailResponseSchema,
]);

export type OPhimMovie = z.infer<typeof ophimMovieSchema>;
export type OPhimEpisodeServer = z.infer<typeof ophimEpisodeServerSchema>;
export type OPhimV1ListResponse = z.infer<typeof ophimV1ListResponseSchema>;
export type OPhimLegacyListResponse = z.infer<typeof ophimLegacyListResponseSchema>;
export type OPhimListResponse = OPhimV1ListResponse | OPhimLegacyListResponse;
export type OPhimTaxonomyResponse = z.infer<typeof ophimTaxonomyResponseSchema>;
export type OPhimV1DetailResponse = z.infer<typeof ophimV1DetailResponseSchema>;
export type OPhimLegacyDetailResponse = z.infer<typeof ophimLegacyDetailResponseSchema>;
export type OPhimDetailResponse = OPhimV1DetailResponse | OPhimLegacyDetailResponse;
