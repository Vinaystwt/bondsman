use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use invoice_pool_v2::invoice_pool_v2::InvoicePoolV2ContractRef;
use odra::{casper_types::bytesrepr::Bytes, prelude::*, ContractRef};
#[odra::module]
pub struct DeliveryContradictionVerifierV2 { used_evidence: Mapping<Bytes, bool> }
#[odra::module]
impl DeliveryContradictionVerifierV2 {
    pub fn init(&mut self) {}
    // Evidence is canonical: action id (8 LE), invoice id (8 LE), occurred-at ms (8 LE),
    // nonce (32), and an Ed25519 signature (64) over the preceding 56 bytes.
    pub fn verify(&mut self, pool: Address, action_id: u64, invoice_id: u64, evidence: Bytes) -> bool {
        let invoice = InvoicePoolV2ContractRef::new(self.env(), pool).get_invoice(invoice_id);
        let raw = evidence.as_slice();
        if raw.len() != 120 || invoice.buyer_signature_pubkey.as_slice().len() != 32 || self.used_evidence.get_or_default(&evidence) { return false; }
        let mut action = [0u8; 8]; action.copy_from_slice(&raw[0..8]);
        let mut invoice_bytes = [0u8; 8]; invoice_bytes.copy_from_slice(&raw[8..16]);
        let mut occurred = [0u8; 8]; occurred.copy_from_slice(&raw[16..24]);
        if u64::from_le_bytes(action) != action_id || u64::from_le_bytes(invoice_bytes) != invoice_id || u64::from_le_bytes(occurred) < invoice.expected_delivery_deadline || u64::from_le_bytes(occurred) > self.env().get_block_time() { return false; }
        let mut key_bytes = [0u8; 32]; key_bytes.copy_from_slice(invoice.buyer_signature_pubkey.as_slice());
        let key = match VerifyingKey::from_bytes(&key_bytes) { Ok(key) => key, Err(_) => return false };
        let signature = match Signature::from_slice(&raw[56..120]) { Ok(signature) => signature, Err(_) => return false };
        if key.verify(&raw[0..56], &signature).is_err() { return false; }
        self.used_evidence.set(&evidence, true); true
    }
}
