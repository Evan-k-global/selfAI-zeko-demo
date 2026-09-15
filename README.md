# SelfPay on Zeko

**Give a Self-verified agent a Celo stablecoin budget—not a blank check.**

SelfPay is a deployable integration kit for agent-native payments:

| Layer | Role |
| --- | --- |
| **Self** | Verifies the human-to-agent binding, enforces credential freshness/policy, and signs a scoped Payment Passport. |
| **Celo** | Holds and settles funds in independently enabled USDm, USDT, and USAT vaults. |
| **Zeko** | Provides a fast, private execution/authorization layer for the compact passport state. |
| **Ethereum** | Provides the testnet integration surface and optional interoperability/liquidity route. |

This is Self-native, Celo-native, and Ethereum-native. Zeko is the execution substrate; the customer-facing trust primitive remains Self.

## What is in this repository

- `src/SelfPayAgentPassportRegistry.ts` — a compact, deployable Zeko zkApp. It verifies a Self-issued signature and updates a passport/nullifier Merkle registry.
- `adapters/self-attestation.ts` — typed server-side boundary from Self verification/Agent ID to a signed passport. It intentionally does **not** embed a specific Self API or webhook schema.
- `adapters/celo-vault.ts` — typed Celo settlement boundary for Self's audited vault/claim adapter.
- `scripts/deploy-selfpay-zeko.ts` — Zeko Sepolia deployment, followed by an admin-authorized issuer configuration transaction.
- `scripts/test-selfpay-local.ts` — a local full path: deploy → configure issuer → sign → anchor → verify state.

The included static product demo is in `demo/`; it uses fixtures only and never touches a wallet or credential provider.

## The payment flow

```text
Self verification / Agent ID
          │  signed, non-PII Payment Passport
          ▼
 Zeko passport registry ── private payment intent/batch ──► merchant claim
          │                                                    │
          └──── policy + nullifier commitment                 ▼
                                        Celo SelfPayVault settles USDm / USDT / USAT
```

The agent receives a mandate: allowed asset(s), merchant policy, per-payment cap, rolling cap, expiry, and emergency stop. It never receives an unrestricted treasury key.

## Fast proof design

Self keeps the expensive and sensitive work where it belongs: in Self-controlled verification, data, and proving systems. The Zeko zkApp only checks:

1. a signature from the immutable Self issuer public key;
2. a compact passport/policy commitment; and
3. two Merkle updates—passport registration and one-time nullifier consumption.

No document fields, raw Self nullifier, or cross-merchant identity are stored on Zeko. A full payment rollup can batch mandate and merchant-policy proofs off-chain, committing only the batch/claim root needed by the Celo vault.

## Why this expands Self's stack and ecosystem

SelfPay turns Self from a verification checkpoint into the trust-control plane for an agent payment economy. A Self-operated Zeko execution network, paired with Celo settlement, gives Self the following product and GTM advantages:

| What Self gains | What Zeko + Celo make possible |
| --- | --- |
| **A native agent-economy primitive** | Self can issue a Payment Passport at agent activation—not merely return a verification result. Apps can ask, “is this agent authorized for this payment?” without seeing who the operator is. |
| **Privacy-preserving merchant interoperability** | A merchant receives a policy-valid payment claim, while the underlying human document, raw nullifier, and cross-merchant identity graph stay with Self. This makes Self the portable trust layer across inference, data, SaaS, and onchain-service vendors. |
| **Fast, predictable agent authorization** | Heavy credential verification and policy proving stay in Self services; Zeko verifies a small Self signature/commitment and updates compact state. Passport issuance and batched intents need not put document circuits in each payment path. |
| **Celo-native stablecoin distribution** | USDm, USDT, and USAT can be enabled independently behind one mandate experience. Self gets a stablecoin-led agent-payment GTM on Celo without treating the assets as interchangeable or taking on unrestricted agent-key custody. |
| **Ownable execution and data plane** | Self can operate the payment API, sequencer, proving workers, indexer/archive, and availability/recovery posture under its own service, policy, and commercial controls. The public interface remains Self-branded; Zeko is the invisible execution rail. |
| **An ecosystem flywheel** | Wallets, agent frameworks, merchants, and Celo apps integrate one passport/claim standard. More supported merchants make a Self-bound agent more useful; more activated agents make Self the default trust surface for machine payments. |
| **Measured decentralization path** | Start with a permissioned, Self-run pilot and clear SLOs; later distribute sequencer/DA/recovery responsibilities and introduce ecosystem governance where it helps. Self can scale the operating model without rewriting the credential or Celo-settlement interfaces. |

### Sovereign-rollup operating model

“Sovereign” here means Self controls the application policy and operating plane—not that it bypasses Celo's asset rules or proof-verified settlement requirements. The native target is:

```text
Self control plane                     Self-operated execution plane              Celo money rail
Enterprise / Agent ID      ─────►      Zeko sequencer + prover workers     ─────►  SelfPayVault
HSM passport signer                   payment API + private intent store          USDm / USDT / USAT
policy / revocation service            indexer + archive + DA/recovery             merchant claim redemption
```

- **Self owns policy:** issuer-key rotation, credential freshness, revocations, merchant eligibility, rate limits, and the commercial terms of a passport.
- **Self owns operations:** sequencer coordination for live state, prover capacity, and the archive path for receipts/events. Availability/data-recovery responsibilities must be explicit and monitored; they are part of the product, not an implementation detail.
- **Celo owns settlement finality:** the Celo vault remains the source of truth for stablecoin custody and merchant redemption. The Zeko-to-Celo adapter must accept only verified batch commitments and remain independently audited.
- **Ethereum is the interoperability proving ground:** use the deployed Zeko Sepolia registry to validate integrations and operations first, then promote the same passport and claim interfaces to the reviewed Celo settlement deployment.

This structure lets Self launch a differentiated payment network now, retain control of the user experience and policy surface, and progressively decentralize infrastructure only when it improves resilience or ecosystem reach.

## Quick start

```sh
npm install
npm test
```

To deploy a new Self-owned Zeko Sepolia registry:

```sh
cp .env.example .env
# set ZEKO_DEPLOYER_PRIVATE_KEY and SELFPAY_ISSUER_PUBLIC_KEY in .env
npm run deploy:zeko
```

`SELFPAY_ISSUER_PUBLIC_KEY` is the public half of a Self HSM/KMS key. The deploy script first creates the registry with the deployer as its one-time configuration admin, then configures the issuer in a second, admin-authorized transaction. The issuer cannot be changed afterward. `SELFPAY_ISSUER_PRIVATE_KEY` is never required by this repository's deploy path and must remain inside Self's signing service.

The repository includes an actual Zeko Sepolia deployment for connectivity and state inspection:

```text
SelfPay Agent Passport Registry (demo)
B62qj7ThaMQt1fVRmMceSFxEoDm8CihnoWYAF4kZGSEKx3K3SEE1AWN
GraphQL: https://sepolia.zeko.io/graphql
o1js network ID: testnet
```

Run `npm run check:zeko` to read its on-chain state. It is a demo deployment only; a production Self deployment must use Self's own issuer public key and funded relayer.

## Self production ownership model

Self can operate this natively as its payment ecosystem without taking custody of every agent key:

1. **Verification service:** Self Enterprise / Agent ID validates the operator and binds their agent operational key.
2. **Attestation service:** a Self backend converts a valid result into `VerifiedSelfPaymentInput`, hashes policy and asset allowlist, and signs the passport from an HSM/KMS.
3. **Zeko service:** Self operates its payment API, sequencer/prover workers, indexer, and availability/recovery posture appropriate for its launch stage.
4. **Celo settlement:** Self deploys/audits `SelfPayVault`, a merchant-policy registry, and a proof-verified claim adapter. Enable USDm, USDT, and USAT individually only after canonical-address, issuer, liquidity, and operational review.
5. **Governance:** isolate owner, issuer, pause, bridge/prover, and upgrade authority; add timelocks, monitoring, limits, and emergency revocation.

## Integration contract

From Self, the only required data is a successful decision—not the user's document data:

```ts
type VerifiedSelfPaymentInput = {
  agentKey: PublicKey;
  policyHash: Field;       // Self policy + mandate terms
  assetPolicyHash: Field;  // allowed Celo asset set commitment
  perPaymentCap: UInt64;
  dailyCap: UInt64;
  expiresAtSlot: UInt64;
  scopedNullifier: Field;  // application/merchant-scoped, never raw identity data
};
```

The `self-attestation` adapter creates `SelfPayAgentPassport` and signs it. The relayer retrieves the current registry root/sequence, builds witnesses, and anchors the passport. The Celo adapter then accepts only a proof-verified Zeko batch claim.

## Scope and safety

This repository is a technical integration reference, not an audited custody, bridge, or compliance product. Before real funds: audit the Celo contracts and cross-chain boundary, add a revocation path and settlement replay protection, use separate HSM-backed keys, and run a permissioned pilot with asset-by-asset controls.
