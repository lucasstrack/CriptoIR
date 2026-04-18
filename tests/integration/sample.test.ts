import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('sample integration', () => {
  it('combina classes com o helper cn', () => {
    expect(cn('bg-black', false && 'hidden', 'text-white')).toBe('bg-black text-white');
  });
});
