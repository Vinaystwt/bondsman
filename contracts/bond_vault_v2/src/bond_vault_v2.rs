use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::cep18_token::Cep18ContractRef;
#[odra::odra_type]
#[derive(Default)]
pub enum BondStatusV2 { #[default] Locked, Released, Slashed }
#[odra::odra_type]
pub struct BondV2 { pub agent: Address, pub amount: U256, pub status: BondStatusV2 }
#[odra::odra_error]
pub enum Error { NotController = 1, BondAlreadyExists = 2, BondNotFound = 3, BondNotLocked = 4, InvalidBasisPoints = 5, NotOwner = 6, ControllerFinalized = 7 }
#[odra::module(errors = Error)]
pub struct BondVaultV2 { owner: Var<Address>, controller: Var<Address>, controller_finalized: Var<bool>, token: Var<Address>, bonds: Mapping<u64, BondV2>, total_locked: Var<U256> }
#[odra::module]
impl BondVaultV2 {
 pub fn init(&mut self, controller: Address, token: Address) { self.owner.set(self.env().caller()); self.controller.set(controller); self.controller_finalized.set(false); self.token.set(token); self.total_locked.set(U256::zero()); }
 pub fn set_controller(&mut self, controller: Address) { self.owner(); if self.controller_finalized.get_or_default() { self.env().revert(Error::ControllerFinalized); } self.controller.set(controller); self.controller_finalized.set(true); }
 pub fn deposit_and_lock(&mut self, action_id: u64, agent: Address, amount: U256) { self.controller(); if self.bonds.get(&action_id).is_some() { self.env().revert(Error::BondAlreadyExists); } self.token().transfer_from(&agent, &self.env().self_address(), &amount); self.bonds.set(&action_id, BondV2 { agent, amount, status: BondStatusV2::Locked }); self.total_locked.add(amount); }
 pub fn release(&mut self, action_id: u64) { self.controller(); let bond = self.locked(action_id); self.token().transfer(&bond.agent, &bond.amount); self.total_locked.subtract(bond.amount); self.bonds.set(&action_id, BondV2 { status: BondStatusV2::Released, ..bond }); }
 pub fn slash(&mut self, action_id: u64, challenger: Address, pool: Address, challenger_bps: u32) { self.controller(); if challenger_bps > 10_000 { self.env().revert(Error::InvalidBasisPoints); } let bond = self.locked(action_id); let reward = bond.amount * U256::from(challenger_bps) / U256::from(10_000u32); let mut token = self.token(); token.transfer(&challenger, &reward); token.transfer(&pool, &(bond.amount - reward)); self.total_locked.subtract(bond.amount); self.bonds.set(&action_id, BondV2 { status: BondStatusV2::Slashed, ..bond }); }
 pub fn get_bond(&self, action_id: u64) -> BondV2 { self.bonds.get(&action_id).unwrap_or_revert_with(self, Error::BondNotFound) }
}
impl BondVaultV2 { fn owner(&self) { if self.env().caller() != self.owner.get_or_revert_with(Error::NotOwner) { self.env().revert(Error::NotOwner); } } fn controller(&self) { if self.env().caller() != self.controller.get_or_revert_with(Error::NotController) { self.env().revert(Error::NotController); } } fn locked(&self, id: u64) -> BondV2 { let bond = self.get_bond(id); if bond.status != BondStatusV2::Locked { self.env().revert(Error::BondNotLocked); } bond } fn token(&self) -> Cep18ContractRef { Cep18ContractRef::new(self.env(), self.token.get_or_revert_with(Error::BondNotFound)) } }
