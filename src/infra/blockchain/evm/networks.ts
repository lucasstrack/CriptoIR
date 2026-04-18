export const EVM_NETWORKS = {
  ETH: {
    envKey: 'ALCHEMY_ETH_KEY',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    nativeAsset: 'ETH',
  },
  BASE: {
    envKey: 'ALCHEMY_BASE_KEY',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/',
    nativeAsset: 'ETH',
  },
  ARB: {
    envKey: 'ALCHEMY_ARB_KEY',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
    nativeAsset: 'ETH',
  },
} as const;

export type EvmNetwork = keyof typeof EVM_NETWORKS;
