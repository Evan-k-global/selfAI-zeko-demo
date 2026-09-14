import { Mina, type NetworkId } from "o1js";

export const ZEKO_SEPOLIA_GRAPHQL_URL = "https://sepolia.zeko.io/graphql";

export function zekoGraphqlUrl(): string {
  return process.env.ZEKO_GRAPHQL_URL || ZEKO_SEPOLIA_GRAPHQL_URL;
}

export function zekoNetworkId(): NetworkId {
  const value = process.env.ZEKO_NETWORK_ID || "testnet";
  return value === "mainnet" || value === "devnet" || value === "testnet"
    ? value
    : { custom: value };
}

export function configureZekoNetwork(): void {
  const archive = process.env.ZEKO_ARCHIVE_URL?.trim();
  Mina.setActiveInstance(Mina.Network({
    mina: zekoGraphqlUrl(),
    ...(archive ? { archive } : {}),
    networkId: zekoNetworkId()
  }));
}

export function zekoTxFee(): number {
  const fee = Number(process.env.ZEKO_TX_FEE || "200000");
  if (!Number.isSafeInteger(fee) || fee <= 0) throw new Error("ZEKO_TX_FEE must be a positive integer.");
  return fee;
}
