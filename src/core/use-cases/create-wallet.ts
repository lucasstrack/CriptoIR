import type { Network } from '@prisma/client';
import { WalletRepository } from '@/infra/db/wallet-repository';
import type { CreateWalletInput } from '@/lib/zod-schemas/wallet';

export class CreateWalletError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_ADDRESS' | 'WALLET_ALREADY_EXISTS',
  ) {
    super(message);
    this.name = 'CreateWalletError';
  }
}

export class CreateWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(input: CreateWalletInput) {
    const normalizedAddress = normalizeAddress(input.network, input.address);

    if (!isValidAddress(input.network, normalizedAddress)) {
      throw new CreateWalletError('Endereco invalido para a rede informada.', 'INVALID_ADDRESS');
    }

    const existingWallet = await this.walletRepository.findByNetworkAndAddress(
      input.network,
      normalizedAddress,
    );

    if (existingWallet) {
      throw new CreateWalletError(
        'Ja existe uma wallet cadastrada com esse endereco nessa rede.',
        'WALLET_ALREADY_EXISTS',
      );
    }

    return this.walletRepository.create({
      label: input.label.trim(),
      address: normalizedAddress,
      network: input.network,
    });
  }
}

export function normalizeAddress(network: Network, address: string) {
  const trimmedAddress = address.trim();

  if (network === 'ETH' || network === 'BASE' || network === 'ARB') {
    return trimmedAddress.toLowerCase();
  }

  return trimmedAddress;
}

export function isValidAddress(network: Network, address: string) {
  switch (network) {
    case 'ETH':
    case 'BASE':
    case 'ARB':
      return /^0x[a-f0-9]{40}$/.test(address);
    case 'SOL':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'BTC':
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
    default:
      return false;
  }
}
