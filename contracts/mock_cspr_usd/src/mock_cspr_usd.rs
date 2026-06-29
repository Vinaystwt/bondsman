use odra::{casper_types::U256, prelude::*};
use odra_modules::cep18_token::Cep18;

#[odra::odra_error]
pub enum Error {
    NotOwner = 1,
}

#[odra::module(errors = Error)]
pub struct MockCsprUSD {
    token: SubModule<Cep18>,
    owner: Var<Address>,
}

#[odra::module]
impl MockCsprUSD {
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.token.init(
            "csprUSD".to_string(),
            "Mock csprUSD".to_string(),
            9,
            U256::zero(),
        );
    }

    pub fn mint(&mut self, to: Address, amount: U256) {
        if self.env().caller() != self.owner.get_or_revert_with(Error::NotOwner) {
            self.env().revert(Error::NotOwner);
        }
        self.token.raw_mint(&to, &amount);
    }

    delegate! {
        to self.token {
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn decimals(&self) -> u8;
            fn total_supply(&self) -> U256;
            fn balance_of(&self, address: &Address) -> U256;
            fn allowance(&self, owner: &Address, spender: &Address) -> U256;
            fn approve(&mut self, spender: &Address, amount: &U256);
            fn decrease_allowance(&mut self, spender: &Address, decr_by: &U256);
            fn increase_allowance(&mut self, spender: &Address, inc_by: &U256);
            fn transfer(&mut self, recipient: &Address, amount: &U256);
            fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256);
        }
    }
}
