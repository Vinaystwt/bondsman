use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::cep18_token::Cep18ContractRef;

#[odra::odra_type]
#[derive(Default)]
pub enum BondStatus {
    #[default]
    Locked,
    Released,
    Slashed,
}

#[odra::odra_type]
pub struct Bond {
    pub agent: Address,
    pub amount: U256,
    pub status: BondStatus,
}

#[odra::event]
pub struct BondLocked {
    pub action_id: u64,
    pub agent: Address,
    pub amount: U256,
}

#[odra::event]
pub struct BondReleased {
    pub action_id: u64,
    pub agent: Address,
    pub amount: U256,
}

#[odra::event]
pub struct BondSlashed {
    pub action_id: u64,
    pub challenger: Address,
    pub challenger_amount: U256,
    pub pool_amount: U256,
}

#[odra::odra_error]
pub enum Error {
    NotController = 1,
    BondAlreadyExists = 2,
    BondNotFound = 3,
    BondNotLocked = 4,
    InvalidBasisPoints = 5,
    NotOwner = 6,
    ControllerFinalized = 7,
}

#[odra::module(
    events = [BondLocked, BondReleased, BondSlashed],
    errors = Error
)]
pub struct BondVault {
    owner: Var<Address>,
    controller: Var<Address>,
    controller_finalized: Var<bool>,
    token: Var<Address>,
    bonds: Mapping<u64, Bond>,
    total_locked: Var<U256>,
}

#[odra::module]
impl BondVault {
    pub fn init(&mut self, controller: Address, token: Address) {
        self.owner.set(self.env().caller());
        self.controller.set(controller);
        self.controller_finalized.set(false);
        self.token.set(token);
        self.total_locked.set(U256::zero());
    }

    pub fn set_controller(&mut self, controller: Address) {
        if self.env().caller() != self.owner.get_or_revert_with(Error::NotOwner) {
            self.env().revert(Error::NotOwner);
        }
        if self.controller_finalized.get_or_default() {
            self.env().revert(Error::ControllerFinalized);
        }
        self.controller.set(controller);
        self.controller_finalized.set(true);
    }

    pub fn deposit_and_lock(&mut self, action_id: u64, agent: Address, amount: U256) {
        self.assert_controller();
        if self.bonds.get(&action_id).is_some() {
            self.env().revert(Error::BondAlreadyExists);
        }

        self.token_ref()
            .transfer_from(&agent, &self.env().self_address(), &amount);

        self.bonds.set(
            &action_id,
            Bond {
                agent,
                amount,
                status: BondStatus::Locked,
            },
        );
        self.total_locked.add(amount);
        self.env().emit_event(BondLocked {
            action_id,
            agent,
            amount,
        });
    }

    pub fn release(&mut self, action_id: u64) {
        self.assert_controller();
        let bond = self.locked_bond(action_id);

        self.token_ref().transfer(&bond.agent, &bond.amount);
        self.total_locked.subtract(bond.amount);
        self.bonds.set(
            &action_id,
            Bond {
                status: BondStatus::Released,
                ..bond
            },
        );
        self.env().emit_event(BondReleased {
            action_id,
            agent: bond.agent,
            amount: bond.amount,
        });
    }

    pub fn slash(
        &mut self,
        action_id: u64,
        challenger: Address,
        pool: Address,
        challenger_bps: u32,
    ) {
        self.assert_controller();
        if challenger_bps > 10_000 {
            self.env().revert(Error::InvalidBasisPoints);
        }
        let bond = self.locked_bond(action_id);
        let challenger_amount =
            bond.amount * U256::from(challenger_bps) / U256::from(10_000u32);
        let pool_amount = bond.amount - challenger_amount;

        let mut token = self.token_ref();
        token.transfer(&challenger, &challenger_amount);
        token.transfer(&pool, &pool_amount);

        self.total_locked.subtract(bond.amount);
        self.bonds.set(
            &action_id,
            Bond {
                status: BondStatus::Slashed,
                ..bond
            },
        );
        self.env().emit_event(BondSlashed {
            action_id,
            challenger,
            challenger_amount,
            pool_amount,
        });
    }

    pub fn get_bond(&self, action_id: u64) -> Bond {
        self.bonds
            .get(&action_id)
            .unwrap_or_revert_with(self, Error::BondNotFound)
    }

    pub fn total_locked(&self) -> U256 {
        self.total_locked.get_or_default()
    }
}

impl BondVault {
    fn assert_controller(&self) {
        let controller = self
            .controller
            .get_or_revert_with(Error::NotController);
        if self.env().caller() != controller {
            self.env().revert(Error::NotController);
        }
    }

    fn locked_bond(&self, action_id: u64) -> Bond {
        let bond = self
            .bonds
            .get(&action_id)
            .unwrap_or_revert_with(self, Error::BondNotFound);
        if bond.status != BondStatus::Locked {
            self.env().revert(Error::BondNotLocked);
        }
        bond
    }

    fn token_ref(&self) -> Cep18ContractRef {
        let address = self.token.get_or_revert_with(Error::BondNotFound);
        Cep18ContractRef::new(self.env(), address)
    }
}
