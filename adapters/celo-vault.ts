/**
 * Celo implementation boundary. Keep canonical token addresses and custody
 * logic in Self's audited Celo contracts/configuration, never in this zkApp.
 */
export type SupportedAsset = "USDm" | "USDT" | "USAT";
export type SpendMandate = {
  agent: `0x${string}`;
  asset: SupportedAsset;
  perPaymentCap: bigint;
  dailyCap: bigint;
  expiresAt: bigint;
  merchantPolicyRoot: `0x${string}`;
};

export interface CeloSelfPayVault {
  deposit(asset: SupportedAsset, amount: bigint): Promise<`0x${string}`>;
  createMandate(mandate: SpendMandate): Promise<`0x${string}`>;
  settleZekoClaim(batchRoot: `0x${string}`, claim: `0x${string}`): Promise<`0x${string}`>;
}
