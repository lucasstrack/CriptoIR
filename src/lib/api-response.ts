import { NextResponse } from 'next/server';
import type { ErrorCode } from '@/lib/errors';

export type Meta = {
  page?: number;
  pageSize?: number;
  total?: number;
  [key: string]: number | string | boolean | undefined;
};

export function ok<T>(data: T, meta: Meta | null = null, status = 200) {
  return NextResponse.json(
    {
      data,
      error: null,
      meta,
    },
    { status },
  );
}

export function err(code: ErrorCode, message: string, status = 500) {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
      meta: null,
    },
    { status },
  );
}
