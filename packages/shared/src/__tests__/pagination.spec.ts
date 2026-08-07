import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { paginatedResponseSchema, paginationQuerySchema } from '../common/pagination';

describe('paginationQuerySchema', () => {
  it('applique la page par défaut et coerce les chaînes numériques', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1 });
    expect(paginationQuerySchema.parse({ page: '3' })).toEqual({ page: 3 });
  });

  it('rejette une page inférieure à 1', () => {
    expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('paginatedResponseSchema', () => {
  it('valide une liste typée avec ses métadonnées de pagination', () => {
    const schema = paginatedResponseSchema(z.object({ id: z.string() }));

    const result = schema.safeParse({
      items: [{ id: 'a' }, { id: 'b' }],
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    });

    expect(result.success).toBe(true);
  });
});
