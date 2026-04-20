import { describe, expect, it, vi } from 'vitest';

const permanentRedirect = vi.fn((): never => {
  throw new Error('NEXT_PERMANENT_REDIRECT');
});

vi.mock('next/navigation', () => ({
  permanentRedirect,
}));

describe('root page (/)', () => {
  it('dispara permanentRedirect para /patrimonio', async () => {
    const RootPage = (await import('@/app/page')).default;

    expect(() => RootPage()).toThrow('NEXT_PERMANENT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledTimes(1);
    expect(permanentRedirect).toHaveBeenCalledWith('/patrimonio');
  });
});
