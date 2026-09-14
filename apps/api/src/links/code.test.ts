import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateCode } from './code.ts';

describe('generateCode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 7 characters from [A-Za-z0-9]', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateCode()).toMatch(/^[A-Za-z0-9]{7}$/);
    }
  });

  it('uses every character class of the alphabet', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const ch of generateCode()) seen.add(ch);
    }
    expect([...seen].some((c) => /[A-Z]/.test(c))).toBe(true);
    expect([...seen].some((c) => /[a-z]/.test(c))).toBe(true);
    expect([...seen].some((c) => /[0-9]/.test(c))).toBe(true);
  });

  it('draws randomness from crypto.randomBytes, never Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const randomBytes = vi.spyOn(crypto, 'randomBytes');
    generateCode();
    expect(random).not.toHaveBeenCalled();
    expect(randomBytes).toHaveBeenCalled();
  });
});
