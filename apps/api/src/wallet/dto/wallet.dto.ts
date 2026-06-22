// Public DTOs returned by the wallet API.

export type WalletOwnerType = 'user' | 'business' | 'platform';

export type PublicWallet = {
  id: string;
  ownerType: WalletOwnerType;
  ownerId: string | null;
  currency: 'INR';
  balancePaise: number;
  pendingPaise: number;
  createdAt: string;
};

export type PublicWalletEntry = {
  id: string;
  walletId: string;
  txnId: string;
  direction: 'D' | 'C';
  amountPaise: number;
  reason: string;
  bucket: 'available' | 'pending';
  meta: Record<string, unknown>;
  createdAt: string;
};

export type WalletWithEntries = {
  wallet: PublicWallet;
  entries: PublicWalletEntry[];
};
