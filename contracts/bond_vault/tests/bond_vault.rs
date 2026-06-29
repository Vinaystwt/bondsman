use bond_vault::bond_vault::{BondStatus, BondVault, BondVaultInitArgs, Error};
use mock_cspr_usd::mock_cspr_usd::MockCsprUSD;
use odra::casper_types::U256;
use odra::host::{Deployer, NoArgs};
use odra::prelude::Addressable;

#[test]
fn rejects_non_controller_and_missing_allowance() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let controller = env.get_account(1);
    let agent = env.get_account(2);
    let token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVault::deploy(
        &env,
        BondVaultInitArgs {
            controller,
            token: token.address(),
        },
    );

    assert_eq!(
        vault
            .try_deposit_and_lock(1, agent, U256::from(100u64))
            .expect_err("owner is not the configured controller"),
        Error::NotController.into()
    );

    env.set_caller(controller);
    assert!(
        vault
            .try_deposit_and_lock(1, agent, U256::from(100u64))
            .is_err(),
        "CEP-18 allowance failure must bubble"
    );
    assert_eq!(env.get_account(0), owner);
}

#[test]
fn locks_and_releases_the_full_bond() {
    let env = odra_test::env();
    let controller = env.get_account(1);
    let agent = env.get_account(2);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVault::deploy(
        &env,
        BondVaultInitArgs {
            controller,
            token: token.address(),
        },
    );

    token.mint(agent, U256::from(1_000u64));
    env.set_caller(agent);
    token.approve(&vault.address(), &U256::from(600u64));
    env.set_caller(controller);

    vault.deposit_and_lock(7, agent, U256::from(600u64));
    let locked = vault.get_bond(7);
    assert_eq!(locked.agent, agent);
    assert_eq!(locked.amount, U256::from(600u64));
    assert_eq!(locked.status, BondStatus::Locked);
    assert_eq!(vault.total_locked(), U256::from(600u64));
    assert_eq!(token.balance_of(&vault.address()), U256::from(600u64));

    vault.release(7);
    assert_eq!(vault.get_bond(7).status, BondStatus::Released);
    assert_eq!(vault.total_locked(), U256::zero());
    assert_eq!(token.balance_of(&agent), U256::from(1_000u64));
    assert_eq!(token.balance_of(&vault.address()), U256::zero());
}

#[test]
fn splits_a_slashed_bond_and_closes_it() {
    let env = odra_test::env();
    let controller = env.get_account(1);
    let agent = env.get_account(2);
    let challenger = env.get_account(3);
    let pool = env.get_account(4);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVault::deploy(
        &env,
        BondVaultInitArgs {
            controller,
            token: token.address(),
        },
    );

    token.mint(agent, U256::from(1_000u64));
    env.set_caller(agent);
    token.approve(&vault.address(), &U256::from(600u64));
    env.set_caller(controller);
    vault.deposit_and_lock(8, agent, U256::from(600u64));

    vault.slash(8, challenger, pool, 5_000);

    assert_eq!(vault.get_bond(8).status, BondStatus::Slashed);
    assert_eq!(vault.total_locked(), U256::zero());
    assert_eq!(token.balance_of(&challenger), U256::from(300u64));
    assert_eq!(token.balance_of(&pool), U256::from(300u64));
    assert_eq!(token.balance_of(&vault.address()), U256::zero());
}
