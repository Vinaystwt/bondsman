use mock_cspr_usd::mock_cspr_usd::{Error, MockCsprUSD};
use odra::casper_types::U256;
use odra::host::{Deployer, HostRef, NoArgs};

#[test]
fn exposes_fixed_cspr_usd_metadata() {
    let env = odra_test::env();
    let token = MockCsprUSD::deploy(&env, NoArgs);

    assert_eq!(token.name(), "Mock csprUSD");
    assert_eq!(token.symbol(), "csprUSD");
    assert_eq!(token.decimals(), 9);
    assert_eq!(token.total_supply(), U256::zero());
}

#[test]
fn only_owner_can_mint() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let recipient = env.get_account(1);
    let outsider = env.get_account(2);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);

    token.mint(recipient, U256::from(500u64));
    assert_eq!(token.balance_of(&recipient), U256::from(500u64));

    token.env().set_caller(outsider);
    let error = token
        .try_mint(owner, U256::from(1u64))
        .expect_err("non-owner mint must revert");
    assert_eq!(error, Error::NotOwner.into());
    assert_eq!(token.total_supply(), U256::from(500u64));
}

#[test]
fn transfers_and_spends_an_allowance() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let spender = env.get_account(1);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);

    token.mint(owner, U256::from(1_000u64));
    token.transfer(&spender, &U256::from(100u64));
    assert_eq!(token.balance_of(&spender), U256::from(100u64));

    token.approve(&spender, &U256::from(250u64));
    assert_eq!(
        token.allowance(&owner, &spender),
        U256::from(250u64)
    );

    token.env().set_caller(spender);
    token.transfer_from(&owner, &spender, &U256::from(200u64));

    assert_eq!(token.balance_of(&owner), U256::from(700u64));
    assert_eq!(token.balance_of(&spender), U256::from(300u64));
    assert_eq!(token.allowance(&owner, &spender), U256::from(50u64));
}
