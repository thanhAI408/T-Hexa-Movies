import { z } from "zod";

const stringOrNumberSchema = z.union([z.string(), z.number()]);
const nullableStringSchema = z.string().nullable().optional();

export const nguoncTaxonomyEntrySchema = z
  .object({
    id: stringOrNumberSchema.optional(),
    name: z.string(),
    slug: z.string().optional(),
  })
  .passthrough();

export const nguoncCategoryGroupSchema = z
  .object({
    group: z
      .object({
        id: stringOrNumberSchema.optional(),
        name: z.string(),
      })
      .passthrough(),
    list: z.array(nguoncTaxonomyEntrySchema).default([]),
  })
  .passthrough();

export const nguoncEpisodeItemSchema = z
  .object({
    name: stringOrNumberSchema,
    slug: nullableStringSchema,
    embed: nullableStringSchema,
  })
  .passthrough();

export const nguoncEpisodeServerSchema = z
  .object({
    server_name: z.string(),
    items: z.array(nguoncEpisodeItemSchema).default([]),
  })
  .passthrough();

export const nguoncMovieSchema = z
  .object({
    id: stringOrNumberSchema.nullable().optional(),
    name: z.string(),
    slug: z.string(),
    original_name: nullableStringSchema,
    thumb_url: nullableStringSchema,
    poster_url: nullableStringSchema,
    created: nullableStringSchema,
    modified: nullableStringSchema,
    description: nullableStringSchema,
    total_episodes: stringOrNumberSchema.nullable().optional(),
    current_episode: nullableStringSchema,
    time: nullableStringSchema,
    quality: nullableStringSchema,
    language: nullableStringSchema,
    director: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
    casts: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
    year: stringOrNumberSchema.nullable().optional(),
    category: z
      .union([
        z.record(z.string(), nguoncCategoryGroupSchema),
        z.array(nguoncCategoryGroupSchema),
      ])
      .nullable()
      .optional(),
    episodes: z.array(nguoncEpisodeServerSchema).optional(),
  })
  .passthrough();

export const nguoncPaginationSchema = z
  .object({
    current_page: stringOrNumberSchema,
    total_page: stringOrNumberSchema,
    total_items: stringOrNumberSchema,
    items_per_page: stringOrNumberSchema,
  })
  .passthrough();

export const nguoncListResponseSchema = z
  .object({
    status: z.literal("success"),
    paginate: nguoncPaginationSchema,
    cat: z
      .object({
        name: z.string().optional(),
        title: z.string().optional(),
        slug: z.string().optional(),
      })
      .passthrough()
      .optional(),
    items: z.array(nguoncMovieSchema),
  })
  .passthrough();

export const nguoncDetailResponseSchema = z
  .object({
    status: z.literal("success"),
    movie: nguoncMovieSchema.extend({
      episodes: z.array(nguoncEpisodeServerSchema).default([]),
    }),
  })
  .passthrough();

export type NguoncMovie = z.infer<typeof nguoncMovieSchema>;
export type NguoncListResponse = z.infer<typeof nguoncListResponseSchema>;
export type NguoncDetailResponse = z.infer<typeof nguoncDetailResponseSchema>;
