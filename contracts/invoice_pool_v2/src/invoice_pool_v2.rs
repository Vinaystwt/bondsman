use odra::{casper_types::{bytesrepr::Bytes, U256}, prelude::*, ContractRef};
use odra_modules::cep18_token::Cep18ContractRef;

#[odra::odra_type]
pub struct InvoiceV2 { pub amount: U256, pub vendor: Address, pub claim_hash: Bytes, pub purchase_order_hash: Bytes, pub expected_delivery_deadline: u64, pub buyer_signature_pubkey: Bytes, pub paid: bool }
#[odra::event]
pub struct PayoutApprovedV2 { pub invoice_id: u64, pub action_id: u64, pub vendor: Address, pub amount: U256 }
#[odra::event]
pub struct DuplicateDetectedV2 { pub action_id: u64, pub first_action_id: u64, pub claim_hash: Bytes }
#[odra::event]
pub struct ReserveFundedV2 { pub amount: U256, pub reserve_balance: U256 }
#[odra::odra_error]
pub enum Error { NotController = 1, NotOwner = 2, InvoiceAlreadyExists = 3, InvoiceNotFound = 4, InvoiceAlreadyPaid = 5, InvoiceMismatch = 6, ControllerFinalized = 7 }

#[odra::module(events = [PayoutApprovedV2, DuplicateDetectedV2, ReserveFundedV2], errors = Error)]
pub struct InvoicePoolV2 { owner: Var<Address>, controller: Var<Address>, controller_finalized: Var<bool>, token: Var<Address>, invoices: Mapping<u64, InvoiceV2>, paid_claims: Mapping<Bytes, u64>, action_dup: Mapping<u64, bool>, reserve_balance: Var<U256> }

#[odra::module]
impl InvoicePoolV2 {
    pub fn init(&mut self, controller: Address, token: Address) { self.owner.set(self.env().caller()); self.controller.set(controller); self.controller_finalized.set(false); self.token.set(token); self.reserve_balance.set(U256::zero()); }
    pub fn set_controller(&mut self, controller: Address) { self.owner(); if self.controller_finalized.get_or_default() { self.env().revert(Error::ControllerFinalized); } self.controller.set(controller); self.controller_finalized.set(true); }
    pub fn submit_invoice(&mut self, invoice_id: u64, amount: U256, vendor: Address, claim_hash: Bytes, purchase_order_hash: Bytes, expected_delivery_deadline: u64, buyer_signature_pubkey: Bytes) { self.owner(); if self.invoices.get(&invoice_id).is_some() { self.env().revert(Error::InvoiceAlreadyExists); } self.invoices.set(&invoice_id, InvoiceV2 { amount, vendor, claim_hash, purchase_order_hash, expected_delivery_deadline, buyer_signature_pubkey, paid: false }); }
    pub fn payout(&mut self, invoice_id: u64, action_id: u64, claim_hash: Bytes, amount: U256) { self.controller(); let mut invoice = self.invoices.get(&invoice_id).unwrap_or_revert_with(self, Error::InvoiceNotFound); if invoice.paid { self.env().revert(Error::InvoiceAlreadyPaid); } if invoice.amount != amount || invoice.claim_hash != claim_hash { self.env().revert(Error::InvoiceMismatch); } self.token_ref().transfer(&invoice.vendor, &amount); if let Some(first_action_id) = self.paid_claims.get(&claim_hash) { self.action_dup.set(&action_id, true); self.env().emit_event(DuplicateDetectedV2 { action_id, first_action_id, claim_hash }); } else { self.paid_claims.set(&claim_hash, action_id); } invoice.paid = true; let vendor = invoice.vendor; self.invoices.set(&invoice_id, invoice); self.env().emit_event(PayoutApprovedV2 { invoice_id, action_id, vendor, amount }); }
    pub fn is_action_duplicate(&self, action_id: u64) -> bool { self.action_dup.get_or_default(&action_id) }
    pub fn add_to_reserve(&mut self, amount: U256) { self.controller(); self.reserve_balance.add(amount); self.env().emit_event(ReserveFundedV2 { amount, reserve_balance: self.reserve_balance.get_or_default() }); }
    pub fn reserve_balance(&self) -> U256 { self.reserve_balance.get_or_default() }
    pub fn get_invoice(&self, invoice_id: u64) -> InvoiceV2 { self.invoices.get(&invoice_id).unwrap_or_revert_with(self, Error::InvoiceNotFound) }
}
impl InvoicePoolV2 { fn owner(&self) { if self.env().caller() != self.owner.get_or_revert_with(Error::NotOwner) { self.env().revert(Error::NotOwner); } } fn controller(&self) { if self.env().caller() != self.controller.get_or_revert_with(Error::NotController) { self.env().revert(Error::NotController); } } fn token_ref(&self) -> Cep18ContractRef { Cep18ContractRef::new(self.env(), self.token.get_or_revert_with(Error::InvoiceNotFound)) } }
