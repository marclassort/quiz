import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../auth/schemas';

describe('registerSchema', () => {
  it('accepte une inscription valide', () => {
    const result = registerSchema.safeParse({
      email: 'napoleon@example.com',
      password: 'motdepassesolide',
      displayName: 'Napoleon',
    });

    expect(result.success).toBe(true);
  });

  it('rejette un mot de passe de moins de 12 caractères', () => {
    const result = registerSchema.safeParse({
      email: 'napoleon@example.com',
      password: 'court1234',
      displayName: 'Napoleon',
    });

    expect(result.success).toBe(false);
  });

  it('rejette un displayName trop court ou trop long', () => {
    expect(
      registerSchema.safeParse({
        email: 'napoleon@example.com',
        password: 'motdepassesolide',
        displayName: 'ab',
      }).success,
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        email: 'napoleon@example.com',
        password: 'motdepassesolide',
        displayName: 'a'.repeat(25),
      }).success,
    ).toBe(false);
  });

  it('rejette un email invalide', () => {
    const result = registerSchema.safeParse({
      email: 'pas-un-email',
      password: 'motdepassesolide',
      displayName: 'Napoleon',
    });

    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepte email + mot de passe non vide', () => {
    expect(loginSchema.safeParse({ email: 'napoleon@example.com', password: 'x' }).success).toBe(
      true,
    );
  });

  it('rejette un mot de passe vide', () => {
    expect(loginSchema.safeParse({ email: 'napoleon@example.com', password: '' }).success).toBe(
      false,
    );
  });
});

describe('verifyEmailSchema', () => {
  it('exige un token non vide', () => {
    expect(verifyEmailSchema.safeParse({ token: 'abc' }).success).toBe(true);
    expect(verifyEmailSchema.safeParse({ token: '' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('exige un email valide', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'napoleon@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'pas-un-email' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('exige un token et un mot de passe valide', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 'abc', password: 'motdepassesolide' }).success,
    ).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'court' }).success).toBe(false);
  });
});
