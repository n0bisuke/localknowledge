import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { PREFECTURE_SLUGS } from './data/prefectures';
import { CATEGORY_SLUGS } from './data/categories';

const knowledge = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/knowledge' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // 都道府県（src/data/prefectures.ts の slug）
    prefecture: z.enum(PREFECTURE_SLUGS),
    // 市区町村・地区など（任意）
    area: z.string().optional(),
    // カテゴリ（src/data/categories.ts の slug）
    category: z.enum(CATEGORY_SLUGS),
    tags: z.array(z.string()).default([]),
    // 調査日・更新日
    researchedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    // 調査状況: draft=下書き（公開しない） / researching=調査中 / done=まとめ済み
    status: z.enum(['draft', 'researching', 'done']).default('researching'),
    // 情報源（文献・Web・聞き取りなど）
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.url().optional(),
          type: z.enum(['web', 'book', 'interview', 'fieldwork', 'other']).default('web'),
          note: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { knowledge };
