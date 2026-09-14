import "reflect-metadata";
import {
  Field, MerkleMap, MerkleMapWitness, Permissions, Poseidon, PublicKey,
  Signature, SmartContract, State, Struct, UInt64, method, state
} from "o1js";

const EMPTY_ROOT = new MerkleMap().getRoot();
const PASSPORT_KEY_NS = Field(91_001);
const PAYMENT_NULLIFIER_NS = Field(91_002);
const SELF_ISSUER_NS = Field(91_003);

/** Compact authorization created only after Self has verified the human-agent binding. */
export class SelfPayAgentPassport extends Struct({
  agentKey: PublicKey,
  policyHash: Field,
  assetPolicyHash: Field,
  perPaymentCap: UInt64,
  dailyCap: UInt64,
  expiresAtSlot: UInt64,
  scopedNullifier: Field
}) {
  fields(): Field[] {
    return [
      ...this.agentKey.toFields(), this.policyHash, this.assetPolicyHash,
      this.perPaymentCap.value, this.dailyCap.value, this.expiresAtSlot.value,
      this.scopedNullifier
    ];
  }
  commitment(): Field { return Poseidon.hash(this.fields()); }
  passportKey(): Field { return Poseidon.hash([PASSPORT_KEY_NS, ...this.agentKey.toFields(), this.policyHash]); }
  nullifierKey(): Field { return Poseidon.hash([PAYMENT_NULLIFIER_NS, this.scopedNullifier]); }
}

export class SelfPayPassportAnchoredEvent extends Struct({
  passportCommitment: Field,
  policyHash: Field,
  assetPolicyHash: Field,
  expiresAtSlot: UInt64,
  registryRoot: Field,
  sequence: UInt64
}) {}

export function selfPaymentPassportMessage(
  registry: PublicKey, sequence: UInt64, passport: SelfPayAgentPassport
): Field[] {
  return [SELF_ISSUER_NS, ...registry.toFields(), sequence.value, ...passport.fields()];
}

/**
 * The fast Zeko-side permission anchor. Self performs document/Agent-ID work
 * off-chain, then signs this scoped, non-PII payment passport from its HSM.
 */
export class SelfPayAgentPassportRegistry extends SmartContract {
  @state(PublicKey) adminKey = State<PublicKey>();
  @state(PublicKey) issuerKey = State<PublicKey>();
  @state(Field) registryRoot = State<Field>();
  @state(UInt64) sequence = State<UInt64>();

  events = { passportAnchored: SelfPayPassportAnchoredEvent };

  init() {
    super.init();
    this.adminKey.set(this.sender.getAndRequireSignature());
    this.issuerKey.set(PublicKey.empty());
    this.registryRoot.set(EMPTY_ROOT);
    this.sequence.set(UInt64.zero);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      setPermissions: Permissions.signature()
    });
  }

  /** Called atomically with deploy; the issuer key cannot be changed afterward. */
  @method async configureIssuer(issuerPublicKey: PublicKey) {
    const admin = this.adminKey.getAndRequireEquals();
    this.sender.getAndRequireSignature().assertEquals(admin);
    const currentIssuer = this.issuerKey.getAndRequireEquals();
    currentIssuer.isEmpty().assertTrue("issuer_already_configured");
    issuerPublicKey.isEmpty().assertFalse("issuer_required");
    this.issuerKey.set(issuerPublicKey);
  }

  @method async anchorPassport(
    passport: SelfPayAgentPassport,
    selfSignature: Signature,
    passportWitness: MerkleMapWitness,
    nullifierWitness: MerkleMapWitness
  ) {
    const issuer = this.issuerKey.getAndRequireEquals();
    const root = this.registryRoot.getAndRequireEquals();
    const sequence = this.sequence.getAndRequireEquals();
    issuer.isEmpty().assertFalse("issuer_not_configured");
    passport.policyHash.assertNotEquals(Field(0));
    passport.assetPolicyHash.assertNotEquals(Field(0));
    passport.scopedNullifier.assertNotEquals(Field(0));
    selfSignature.verify(issuer, selfPaymentPassportMessage(this.address, sequence, passport))
      .assertTrue("invalid_self_payment_passport");

    const commitment = passport.commitment();
    const [beforePassport, passportKey] = passportWitness.computeRootAndKey(Field(0));
    beforePassport.assertEquals(root);
    passportKey.assertEquals(passport.passportKey());
    const [afterPassport] = passportWitness.computeRootAndKey(commitment);
    const [beforeNullifier, nullifierKey] = nullifierWitness.computeRootAndKey(Field(0));
    beforeNullifier.assertEquals(afterPassport);
    nullifierKey.assertEquals(passport.nullifierKey());
    const [nextRoot] = nullifierWitness.computeRootAndKey(Field(1));
    const nextSequence = sequence.add(1);
    this.registryRoot.set(nextRoot);
    this.sequence.set(nextSequence);
    this.emitEvent("passportAnchored", new SelfPayPassportAnchoredEvent({
      passportCommitment: commitment, policyHash: passport.policyHash,
      assetPolicyHash: passport.assetPolicyHash, expiresAtSlot: passport.expiresAtSlot,
      registryRoot: nextRoot, sequence: nextSequence
    }));
  }
}
