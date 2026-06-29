use bond_vault::bond_vault::{BondStatus, BondVault, BondVaultInitArgs};
use bondsman_controller::bondsman_controller::{
    ActionStatus, BondsmanController, BondsmanControllerInitArgs, Error,
};
use mock_cspr_usd::mock_cspr_usd::MockCsprUSD;
use odra::casper_types::{bytesrepr::Bytes, U256};
use odra::host::{Deployer, NoArgs};
use odra::prelude::Addressable;

const UNIT: u64 = 1_000_000_000;

#[test]
fn computes_the_three_risk_tiers() {
    let env = odra_test::env();
    let agent = env.get_account(2);
    let token = MockCsprUSD::deploy(&env, NoArgs);
    let vault = BondVault::deploy(
        &env,
        BondVaultInitArgs {
            controller: env.get_account(0),
            token: token.address(),
        },
    );
    let controller = BondsmanController::deploy(
        &env,
        BondsmanControllerInitArgs {
            vault: vault.address(),
            pool: env.get_account(4),
            token: token.address(),
            window_secs: 300,
            challenger_bps: 5_000,
        },
    );

    assert_eq!(
        controller.get_bond_required(U256::from(9_999 * UNIT), agent),
        U256::from(199_980_000_000u64)
    );
    assert_eq!(
        controller.get_bond_required(U256::from(10_000 * UNIT), agent),
        U256::from(300 * UNIT)
    );
    assert_eq!(
        controller.get_bond_required(U256::from(50_000 * UNIT), agent),
        U256::from(2_500 * UNIT)
    );
}

#[test]
fn initiates_posts_and_executes_with_a_millisecond_window() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let agent = env.get_account(2);
    let outsider = env.get_account(3);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVault::deploy(
        &env,
        BondVaultInitArgs {
            controller: owner,
            token: token.address(),
        },
    );
    let mut controller = BondsmanController::deploy(
        &env,
        BondsmanControllerInitArgs {
            vault: vault.address(),
            pool: env.get_account(4),
            token: token.address(),
            window_secs: 300,
            challenger_bps: 5_000,
        },
    );
    vault.set_controller(controller.address());
    env.set_caller(outsider);
    assert_eq!(
        vault
            .try_set_controller(outsider)
            .expect_err("only the deployer may bootstrap the controller"),
        bond_vault::bond_vault::Error::NotOwner.into()
    );
    env.set_caller(owner);
    assert_eq!(
        vault
            .try_set_controller(owner)
            .expect_err("controller wiring closes permanently"),
        bond_vault::bond_vault::Error::ControllerFinalized.into()
    );

    token.mint(agent, U256::from(1_000 * UNIT));
    env.set_caller(agent);
    token.approve(&vault.address(), &U256::from(20 * UNIT));

    let action_id = controller.initiate_action(
        1045,
        Bytes::from(vec![1u8; 32]),
        U256::from(1_000 * UNIT),
        Bytes::from(vec![2u8; 32]),
    );
    assert_eq!(action_id, 0);
    let initiated = controller.get_action(action_id);
    assert_eq!(initiated.status, ActionStatus::Initiated);
    assert_eq!(initiated.bond_required, U256::from(20 * UNIT));

    assert_eq!(
        controller
            .try_execute_action(action_id)
            .expect_err("execution without a bond must revert"),
        Error::InsufficientBond.into()
    );

    env.set_caller(outsider);
    assert_eq!(
        controller
            .try_post_bond(action_id)
            .expect_err("only the action agent may post"),
        Error::NotAgent.into()
    );

    env.set_caller(agent);
    controller.post_bond(action_id);
    assert_eq!(controller.get_action(action_id).status, ActionStatus::Bonded);
    assert_eq!(vault.get_bond(action_id).status, BondStatus::Locked);

    controller.execute_action(action_id);
    let executed = controller.get_action(action_id);
    assert_eq!(executed.status, ActionStatus::Executed);
    assert_eq!(executed.bond_posted, U256::from(20 * UNIT));
    assert_eq!(executed.window_end, 300_000);
}
