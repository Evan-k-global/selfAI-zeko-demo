import { Field, Poseidon, PrivateKey, PublicKey, Signature, UInt64 } from "o1js";
import { SelfPayAgentPassport, selfPaymentPassportMessage } from "../src/SelfPayAgentPassportRegistry.js";

/**
 * Boundary owned by Self: call the official Self verification/Agent ID system,
 * then map only a successful policy decision into this non-PII shape.
 */
export type VerifiedSelfPaymentInput = {
  agentKey: PublicKey;
  policyHash: Field;
  assetPolicyHash: Field;
  perPaymentCap: UInt64;
  dailyCap: UInt64;
  expiresAtSlot: UInt64;
  scopedNullifier: Field;
};

export function makePassport(input: VerifiedSelfPaymentInput): SelfPayAgentPassport {
  return new SelfPayAgentPassport(input);
}

/** Must run only inside Self's server/HSM signer service; never in a browser. */
export function signPassport(
  issuerKey: PrivateKey, registry: PublicKey, sequence: UInt64, passport: SelfPayAgentPassport
) : Signature {
  return Signature.create(issuerKey, selfPaymentPassportMessage(registry, sequence, passport));
}

/** Useful for deriving scoped commitments without retaining document identifiers. */
export function scopedNullifierCommitment(selfScopedNullifier: Field, merchantScope: Field): Field {
  return Poseidon.hash([Field(91_004), selfScopedNullifier, merchantScope]);
}
