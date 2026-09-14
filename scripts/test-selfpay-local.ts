import {
  AccountUpdate, Field, MerkleMap, Mina, Poseidon, PrivateKey, Signature, UInt64
} from "o1js";
import {
  SelfPayAgentPassport, SelfPayAgentPassportRegistry, selfPaymentPassportMessage
} from "../src/SelfPayAgentPassportRegistry.js";

const local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(local);
const deployer = local.testAccounts[0].key;
const issuer = PrivateKey.random();
const zkappKey = PrivateKey.random();
const zkapp = new SelfPayAgentPassportRegistry(zkappKey.toPublicKey());
await SelfPayAgentPassportRegistry.compile();

let tx = await Mina.transaction(deployer.toPublicKey(), async () => {
  AccountUpdate.fundNewAccount(deployer.toPublicKey());
  await zkapp.deploy();
});
await tx.prove();
await tx.sign([deployer, zkappKey]).send();
tx = await Mina.transaction(deployer.toPublicKey(), async () => {
  await zkapp.configureIssuer(issuer.toPublicKey());
});
await tx.prove();
await tx.sign([deployer]).send();

const passport = new SelfPayAgentPassport({
  agentKey: PrivateKey.random().toPublicKey(),
  policyHash: Poseidon.hash([Field(18), Field(5)]),
  assetPolicyHash: Poseidon.hash([Field(1), Field(2), Field(3)]),
  perPaymentCap: UInt64.from(25_000), dailyCap: UInt64.from(500_000),
  expiresAtSlot: UInt64.from(4_000_000_000), scopedNullifier: Poseidon.hash([Field(99), Field(1)])
});
const map = new MerkleMap();
const passportWitness = map.getWitness(passport.passportKey());
map.set(passport.passportKey(), passport.commitment());
const nullifierWitness = map.getWitness(passport.nullifierKey());
map.set(passport.nullifierKey(), Field(1));
const signature = Signature.create(issuer, selfPaymentPassportMessage(zkapp.address, UInt64.zero, passport));
tx = await Mina.transaction(deployer.toPublicKey(), async () => {
  await zkapp.anchorPassport(passport, signature, passportWitness, nullifierWitness);
});
await tx.prove();
await tx.sign([deployer]).send();
if (zkapp.sequence.get().toString() !== "1") throw new Error("Passport anchor failed.");
console.log(JSON.stringify({ status: "ok", sequence: "1", registryRoot: zkapp.registryRoot.get().toString() }));
