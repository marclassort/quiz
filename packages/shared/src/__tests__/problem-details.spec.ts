import { describe, expect, it } from 'vitest';

import { problemDetailsSchema } from '../common/problem-details';

describe('problemDetailsSchema', () => {
  it('valide un objet RFC 9457 minimal', () => {
    const result = problemDetailsSchema.safeParse({
      type: 'https://example.com/errors/validation',
      title: 'Validation error',
      status: 400,
    });

    expect(result.success).toBe(true);
  });

  it('rejette un objet sans status', () => {
    const result = problemDetailsSchema.safeParse({
      type: 'https://example.com/errors/validation',
      title: 'Validation error',
    });

    expect(result.success).toBe(false);
  });
});
