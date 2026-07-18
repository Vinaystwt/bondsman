use invoice_pool_v2::invoice_pool_v2::InvoicePoolV2ContractRef;
use odra::{prelude::*, ContractRef};
#[odra::module]
pub struct DuplicateClaimVerifierV2 {}
#[odra::module]
impl DuplicateClaimVerifierV2 { pub fn init(&mut self) {} pub fn verify(&self, pool: Address, action_id: u64) -> bool { InvoicePoolV2ContractRef::new(self.env(), pool).is_action_duplicate(action_id) } }
