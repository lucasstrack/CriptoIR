import fs from 'node:fs';

type ProviderCheck = {
  name: string;
  enabled: boolean;
  run: () => Promise<void>;
};

function getEnv() {
  const path = '.env.local';
  if (!fs.existsSync(path)) {
    return null;
  }

  const content = fs.readFileSync(path, 'utf8');
  const entries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')] as const;
    });

  return Object.fromEntries(entries);
}

async function ensureOk(response: Response, provider: string) {
  if (!response.ok) {
    throw new Error(`${provider} respondeu com HTTP ${response.status}`);
  }
}

async function main() {
  const env = getEnv();

  if (!env) {
    console.warn('Sem .env.local configurado; pulando validacao de providers.');
    process.exit(0);
  }

  const checks: ProviderCheck[] = [
    {
      name: 'Alchemy ETH',
      enabled: Boolean(env.ALCHEMY_ETH_KEY),
      run: async () => {
        const response = await fetch(
          `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_ETH_KEY}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          },
        );
        await ensureOk(response, 'Alchemy ETH');
      },
    },
    {
      name: 'Alchemy BASE',
      enabled: Boolean(env.ALCHEMY_BASE_KEY),
      run: async () => {
        const response = await fetch(
          `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_BASE_KEY}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          },
        );
        await ensureOk(response, 'Alchemy BASE');
      },
    },
    {
      name: 'Alchemy ARB',
      enabled: Boolean(env.ALCHEMY_ARB_KEY),
      run: async () => {
        const response = await fetch(
          `https://arb-mainnet.g.alchemy.com/v2/${env.ALCHEMY_ARB_KEY}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          },
        );
        await ensureOk(response, 'Alchemy ARB');
      },
    },
    {
      name: 'Alchemy SOL',
      enabled: Boolean(env.ALCHEMY_SOL_KEY),
      run: async () => {
        const response = await fetch(
          `https://solana-mainnet.g.alchemy.com/v2/${env.ALCHEMY_SOL_KEY}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] }),
          },
        );
        await ensureOk(response, 'Alchemy SOL');
      },
    },
    {
      name: 'Helius',
      enabled: Boolean(env.HELIUS_KEY),
      run: async () => {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_KEY}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] }),
        });
        await ensureOk(response, 'Helius');
      },
    },
    {
      name: 'CoinGecko',
      enabled: Boolean(env.COINGECKO_KEY),
      run: async () => {
        const response = await fetch('https://api.coingecko.com/api/v3/ping', {
          headers: { 'x-cg-demo-api-key': env.COINGECKO_KEY },
        });
        await ensureOk(response, 'CoinGecko');
      },
    },
  ];

  let failures = 0;

  for (const check of checks) {
    if (!check.enabled) {
      console.log(`- ${check.name}: skip (sem chave)`);
      continue;
    }

    try {
      await check.run();
      console.log(`✓ ${check.name}`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main();
