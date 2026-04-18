import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/wallets/route';
import { prisma } from '@/infra/db/prisma';
import { ensureTestSchema } from '@/../tests/integration/helpers/ensure-test-schema';

describe('/api/wallets', () => {
  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    await prisma.wallet.deleteMany();
  });

  it('POST /api/wallets cria wallet valida e retorna 201', async () => {
    const request = new Request('http://localhost:3000/api/wallets', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Carteira principal',
        address: '0xAbCDEFabcdefABCDEFabcdefABCDEFabcdef1234',
        network: 'ETH',
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.error).toBeNull();
    expect(payload.data).toMatchObject({
      label: 'Carteira principal',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdef1234',
      network: 'ETH',
    });
  });

  it('POST /api/wallets rejeita duplicidade por rede e endereco', async () => {
    const body = {
      label: 'Carteira principal',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdef1234',
      network: 'ETH',
    };

    await POST(
      new Request('http://localhost:3000/api/wallets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

    const response = await POST(
      new Request('http://localhost:3000/api/wallets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...body,
          label: 'Duplicada',
          address: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEF1234'.toLowerCase(),
        }),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatchObject({
      code: 'WALLET_ALREADY_EXISTS',
    });
  });

  it('POST /api/wallets rejeita endereco invalido', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/wallets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: 'Sol invalida',
          address: 'sol-invalido',
          network: 'SOL',
        }),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({
      code: 'INVALID_ADDRESS',
    });
  });

  it('GET /api/wallets lista wallets cadastradas', async () => {
    await POST(
      new Request('http://localhost:3000/api/wallets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: 'Wallet BTC',
          address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
          network: 'BTC',
        }),
      }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeNull();
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({
      label: 'Wallet BTC',
      network: 'BTC',
    });
  });
});
