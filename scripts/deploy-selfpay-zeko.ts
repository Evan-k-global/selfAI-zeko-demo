import "dotenv/config";
import { AccountUpdate, fetchAccount, Mina, PrivateKey, PublicKey } from "o1js";
import { SelfPayAgentPassportRegistry } from "../src/SelfPayAgentPassportRegistry.js";
import { configureZekoNetwork, zekoGraphqlUrl, zekoNetworkId, zekoTxFee } from "../src/zeko-network.js";

const deployerPrivateKey = process.env.ZEKO_DEPLOYER_PRIVATE_KEY;
const issuerPublicKey = process.env.SELFPAY_ISSUER_PUBLIC_KEY;
if (!deployerPrivateKey || !issuerPublicKey) {
  throw new Error("Set ZEKO_DEPLOYER_PRIVATE_KEY and SELFPAY_ISSUER_PUBLIC_KEY in a server-side .env.");
}

configureZekoNetwork();
const deployer = PrivateKey.fromBase58(deployerPrivateKey);
const issuer = PublicKey.fromBase58(issuerPublicKey);
const zkappKey = PrivateKey.random();
const zkapp = new SelfPayAgentPassportRegistry(zkappKey.toPublicKey());
const account = await fetchAccount({ publicKey: deployer.toPublicKey() }, zekoGraphqlUrl());
if (!account.account) throw new Error("Configured deployer has no Zeko Sepolia account/funds.");

console.log(`Compiling SelfPay passport registry for ${zekoGraphqlUrl()}…`);
await SelfPayAgentPassportRegistry.compile();
const fee = zekoTxFee();
const tx = await Mina.transaction({ sender: deployer.toPublicKey(), fee }, async () => {
  AccountUpdate.fundNewAccount(deployer.toPublicKey());
  await zkapp.deploy();
});
await tx.prove();
const sent = await tx.sign([deployer, zkappKey]).send();
if (sent.status === "rejected") throw new Error(`Zeko rejected deployment: ${JSON.stringify(sent)}`);
const configureTx = await Mina.transaction({ sender: deployer.toPublicKey(), fee }, async () => {
  await zkapp.configureIssuer(issuer);
});
await configureTx.prove();
const configured = await configureTx.sign([deployer]).send();
if (configured.status === "rejected") throw new Error(`Zeko rejected issuer configuration: ${JSON.stringify(configured)}`);

console.log(JSON.stringify({
  name: "SelfPay Agent Passport Registry",
  zkappAddress: zkapp.address.toBase58(),
  issuerPublicKey: issuer.toBase58(),
  graphQlUrl: zekoGraphqlUrl(), networkId: zekoNetworkId(), fee, sent, configured
}, null, 2));
