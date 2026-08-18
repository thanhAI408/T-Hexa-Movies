import { z } from "zod";

const scalarSchema = z.union([z.string(), z.number()]);
const nullableScalarSchema = scalarSchema.nullable().optional();
const nullableStringSchema = z.string().nullable().optional();
const successStatusSchema = z.union([z.literal(true), z.literal("success")]);

export const kkphimTaxonomyItemSchema = z
  .object({
    id: nullableScalarSchema,
    _id: nullableScalarSchema,
    name: z.string(),
    slug: z.string(),
  })
  .passthrough();

const externalSourceSchema = z
  .object({
    id: nullableScalarSchema,
    type: nullableStringSchema,
    season: nullableScalarSchema,
    vote_average: nullableScalarSchema,
    vote_count: nullableScalarSchema,
  })
  .passthrough();

export const kkphimEpisodeDataSchema = z
  .object({
    name: scalarSchema,
    slug: nullableStringSchema,
    filename: nullableStringSchema,
    link_embed: nullableStringSchema,
    link_m3u8: nullableStringSchema,
  })
  .passthrough();

export const kkphimEpisodeServerSchema = z
  .object({
    server_name: z.string(),
    is_ai: z.boolean().nullable().optional(),
    server_data: z.array(kkphimEpisodeDataSchema).default([]),
  })
  .passthrough();

export const kkphimMovieSchema = z
  .object({
    tmdb: externalSourceSchema.nullable().optional(),
    imdb: externalSourceSchema.nullable().optional(),
    created: z
      .object({ time: nullableStringSchema })
      .passthrough()
      .nullable()
      .optional(),
    modified: z
      .object({ time: nullableStringSchema })
      .passthrough()
      .nullable()
      .optional(),
    _id: nullableScalarSchema,
    name: z.string(),
    slug: z.string(),
    origin_name: nullableStringSchema,
    alternative_names: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    content: nullableStringSchema,
    type: nullableStringSchema,
    status: nullableStringSchema,
    thumb_url: nullableStringSchema,
    poster_url: nullableStringSchema,
    is_copyright: z.boolean().nullable().optional(),
    sub_docquyen: z.boolean().nullable().optional(),
    chieurap: z.boolean().nullable().optional(),
    is_published: z.boolean().nullable().optional(),
    trailer_url: nullableStringSchema,
    time: nullableStringSchema,
    episode_current: nullableStringSchema,
    episode_total: nullableScalarSchema,
    quality: nullableStringSchema,
    lang: nullableStringSchema,
    lang_key: z.array(z.string()).nullable().optional(),
    notify: nullableStringSchema,
    showtimes: nullableStringSchema,
    year: nullableScalarSchema,
    view: nullableScalarSchema,
    actor: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    director: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    category: z.array(kkphimTaxonomyItemSchema).nullable().optional(),
    country: z.array(kkphimTaxonomyItemSchema).nullable().optional(),
    last_episodes: z
      .array(
        z
          .object({
            server_name: z.string(),
            is_ai: z.boolean().nullable().optional(),
            name: scalarSchema,
          })
          .passthrough(),
      )
      .optional(),
    episodes: z.array(kkphimEpisodeServerSchema).optional(),
  })
  .passthrough();

export const kkphimPaginationSchema = z
  .object({
    totalItems: nullableScalarSchema,
    totalItemsPerPage: nullableScalarSchema,
    currentPage: nullableScalarSchema,
    totalPages: nullableScalarSchema,
    pageRanges: nullableScalarSchema,
  })
  .passthrough();

const kkphimListDataSchema = z
  .object({
    items: z.array(kkphimMovieSchema),
    params: z
      .object({ pagination: kkphimPaginationSchema.optional() })
      .passthrough()
      .optional(),
    APP_DOMAIN_CDN_IMAGE: nullableStringSchema,
  })
  .passthrough();

export const kkphimListResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    items: z.array(kkphimMovieSchema).optional(),
    pagination: kkphimPaginationSchema.optional(),
    pathImage: nullableStringSchema,
    data: kkphimListDataSchema.optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (!value.items && !value.data?.items) {
      context.addIssue({
        code: "custom",
        message: "KKPhim list response has no items array",
      });
    }
  });

const kkphimDetailDataSchema = z
  .object({
    item: kkphimMovieSchema,
    APP_DOMAIN_CDN_IMAGE: nullableStringSchema,
  })
  .passthrough();

export const kkphimDetailResponseSchema = z
  .object({
    status: successStatusSchema,
    msg: z.string().optional(),
    message: z.string().optional(),
    movie: kkphimMovieSchema.optional(),
    episodes: z.array(kkphimEpisodeServerSchema).optional(),
    data: kkphimDetailDataSchema.optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (!value.movie && !value.data?.item) {
      context.addIssue({
        code: "custom",
        message: "KKPhim detail response has no movie item",
      });
    }
  });

export const kkphimTaxonomyResponseSchema = z
  .object({
    status: successStatusSchema,
    message: z.string().optional(),
    data: z
      .object({ items: z.array(kkphimTaxonomyItemSchema) })
      .passthrough(),
  })
  .passthrough();

export const kkphimYearsResponseSchema = z
  .object({
    status: successStatusSchema,
    message: z.string().optional(),
    data: z
      .object({
        items: z.array(
          z
            .object({ year: scalarSchema })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();

export type KkphimMovie = z.infer<typeof kkphimMovieSchema>;
export type KkphimListResponse = z.infer<typeof kkphimListResponseSchema>;
export type KkphimDetailResponse = z.infer<typeof kkphimDetailResponseSchema>;
