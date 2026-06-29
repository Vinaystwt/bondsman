use bond_vault::bond_vault::BondVaultContractRef;
use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    prelude::*,
    ContractRef,
};

const TOKEN_UNIT: u64 = 1_000_000_000;

#[odra::odra_type]
#[derive(Default)]
pub enum ActionStatus {
    #[default]
    Initiated,
    Bonded,
    Executed,
    Challenged,
    ResolvedSlash,
    ResolvedRefund,
}

#[odra::odra_type]
pub struct Action {
    pub agent: Address,
    pub invoice_id: u64,
    pub claim_hash: Bytes,
    pub amount: U256,
    pub reasoning_hash: Bytes,
    pub bond_required: U256,
    pub bond_posted: U256,
    pub window_end: u64,
    pub status: ActionStatus,
    pub challenger: Option<Address>,
}

#[odra::odra_type]
#[derive(Default)]
pub struct Rep {
    pub clean: u32,
    pub slashed: u32,
    pub score: i64,
}

#[odra::event]
pub struct ActionInitiated {
    pub action_id: u64,
    pub agent: Address,
    pub invoice_id: u64,
    pub amount: U256,
    pub bond_required: U256,
    pub reasoning_hash: Bytes,
}

#[odra::event]
pub struct BondPosted {
    pub action_id: u64,
    pub agent: Address,
    pub amount: U256,
}

#[odra::event]
pub struct ActionExecuted {
    pub action_id: u64,
    pub window_end: u64,
}

#[odra::odra_error]
pub enum Error {
    ActionNotFound = 1,
    NotAgent = 2,
    InvalidStatus = 3,
    InsufficientBond = 4,
    InvalidBasisPoints = 5,
}

#[odra::module(
    events = [ActionInitiated, BondPosted, ActionExecuted],
    errors = Error
)]
pub struct BondsmanController {
    vault: Var<Address>,
    pool: Var<Address>,
    token: Var<Address>,
    next_action_id: Var<u64>,
    actions: Mapping<u64, Action>,
    reputation: Mapping<Address, Rep>,
    window_secs: Var<u64>,
    challenger_bps: Var<u32>,
}

#[odra::module]
impl BondsmanController {
    pub fn init(
        &mut self,
        vault: Address,
        pool: Address,
        token: Address,
        window_secs: u64,
        challenger_bps: u32,
    ) {
        if challenger_bps > 10_000 {
            self.env().revert(Error::InvalidBasisPoints);
        }
        self.vault.set(vault);
        self.pool.set(pool);
        self.token.set(token);
        self.next_action_id.set(0);
        self.window_secs.set(window_secs);
        self.challenger_bps.set(challenger_bps);
    }

    pub fn initiate_action(
        &mut self,
        invoice_id: u64,
        claim_hash: Bytes,
        amount: U256,
        reasoning_hash: Bytes,
    ) -> u64 {
        let agent = self.env().caller();
        let action_id = self.next_action_id.get_or_default();
        let bond_required = self.get_bond_required(amount, agent);
        let action = Action {
            agent,
            invoice_id,
            claim_hash,
            amount,
            reasoning_hash: reasoning_hash.clone(),
            bond_required,
            bond_posted: U256::zero(),
            window_end: 0,
            status: ActionStatus::Initiated,
            challenger: None,
        };
        self.actions.set(&action_id, action);
        self.next_action_id.set(action_id + 1);
        self.env().emit_event(ActionInitiated {
            action_id,
            agent,
            invoice_id,
            amount,
            bond_required,
            reasoning_hash,
        });
        action_id
    }

    pub fn post_bond(&mut self, action_id: u64) {
        let mut action = self.action_for_agent(action_id);
        if action.status != ActionStatus::Initiated {
            self.env().revert(Error::InvalidStatus);
        }

        self.vault_ref()
            .deposit_and_lock(action_id, action.agent, action.bond_required);
        action.bond_posted = action.bond_required;
        action.status = ActionStatus::Bonded;
        let agent = action.agent;
        let amount = action.bond_required;
        self.actions.set(&action_id, action);
        self.env().emit_event(BondPosted {
            action_id,
            agent,
            amount,
        });
    }

    pub fn execute_action(&mut self, action_id: u64) {
        let mut action = self.action_for_agent(action_id);
        if action.bond_posted < action.bond_required {
            self.env().revert(Error::InsufficientBond);
        }
        if action.status != ActionStatus::Bonded {
            self.env().revert(Error::InvalidStatus);
        }

        let window_end = self.env().get_block_time()
            + self.window_secs.get_or_default() * 1_000;
        action.window_end = window_end;
        action.status = ActionStatus::Executed;
        self.actions.set(&action_id, action);
        self.env().emit_event(ActionExecuted {
            action_id,
            window_end,
        });
    }

    pub fn get_action(&self, action_id: u64) -> Action {
        self.actions
            .get(&action_id)
            .unwrap_or_revert_with(self, Error::ActionNotFound)
    }

    pub fn get_reputation(&self, agent: Address) -> Rep {
        self.reputation.get_or_default(&agent)
    }

    pub fn get_bond_required(&self, amount: U256, agent: Address) -> U256 {
        let base_bps = if amount >= U256::from(50_000u64 * TOKEN_UNIT) {
            500u32
        } else if amount >= U256::from(10_000u64 * TOKEN_UNIT) {
            300u32
        } else {
            200u32
        };
        let score = self.reputation.get_or_default(&agent).score;
        let penalty_bps = if score < 0 {
            score.unsigned_abs().min(300) as u32
        } else {
            0
        };
        amount * U256::from(base_bps + penalty_bps) / U256::from(10_000u32)
    }
}

impl BondsmanController {
    fn action_for_agent(&self, action_id: u64) -> Action {
        let action = self
            .actions
            .get(&action_id)
            .unwrap_or_revert_with(self, Error::ActionNotFound);
        if self.env().caller() != action.agent {
            self.env().revert(Error::NotAgent);
        }
        action
    }

    fn vault_ref(&self) -> BondVaultContractRef {
        let address = self.vault.get_or_revert_with(Error::ActionNotFound);
        BondVaultContractRef::new(self.env(), address)
    }
}
