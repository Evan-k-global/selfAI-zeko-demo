import { fetchAccount, PublicKey } from "o1js";
import { configureZekoNetwork, zekoGraphqlUrl } from "../src/zeko-network.js";

const address = process.env.SELFPAY_REGISTRY_ADDRESS || "B62qj7ThaMQt1fVRmMceSFxEoDm8CihnoWYAF4kZGSEKx3K3SEE1AWN";
configureZekoNetwork();
const result = await fetchAccount({ publicKey: PublicKey.fromBase58(address) }, zekoGraphqlUrl());
if (!result.account) throw new Error(`No zkApp found at ${address}`);
console.log(JSON.stringify({ address, graphQlUrl: zekoGraphqlUrl(), zkappState: result.account.zkapp?.appState.map(String) }, null, 2));
