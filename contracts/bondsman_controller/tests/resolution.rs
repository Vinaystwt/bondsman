use bond_vault::bond_vault::{BondStatus, BondVault, BondVaultHostRef, BondVaultInitArgs};
use bondsman_controller::bondsman_controller::{
    ActionStatus, BondsmanController, BondsmanControllerHostRef, BondsmanControllerInitArgs, Error,
};
use invoice_pool::invoice_pool::{InvoicePool, InvoicePoolHostRef, InvoicePoolInitArgs};
use mock_cspr_usd::mock_cspr_usd::{MockCsprUSD, MockCsprUSDHostRef};
use odra::casper_types::{bytesrepr::Bytes, U256};
use odra::host::{Deployer, HostEnv, NoArgs};
use odra::prelude::{Address, Addressable};

const UNIT: u64 = 1_000_000_000;
const INVOICE_AMOUNT: u64 = 1_000 * UNIT;
const BOND_AMOUNT: u64 = 20 * UNIT;

struct System {
    env: HostEnv,
    owner: Address,
    agent: Address,
    challenger: Address,
    vendor: Address,
    token: MockCsprUSDHostRef,
    vault: BondVaultHostRef,
    controller: BondsmanControllerHostRef,
    pool: InvoicePoolHostRef,
}

fn setup() -> System {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let agent = env.get_account(1);
    let challenger = env.get_account(2);
    let vendor = env.get_account(3);
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
            pool: owner,
            token: token.address(),
            window_secs: 300,
            challenger_bps: 5_000,
        },
    );
    let pool = InvoicePool::deploy(
        &env,
        InvoicePoolInitArgs {
            controller: controller.address(),
            token: token.address(),
        },
    );
    vault.set_controller(controller.address());
    controller.set_pool(pool.address());

    token.mint(agent, U256::from(10 * BOND_AMOUNT));
    token.mint(pool.address(), U256::from(4 * INVOICE_AMOUNT));
    env.set_caller(agent);
    token.approve(&vault.address(), &U256::from(10 * BOND_AMOUNT));
    env.set_caller(owner);

    System {
        env,
        owner,
        agent,
        challenger,
        vendor,
        token,
        vault,
        controller,
        pool,
    }
}

fn submit_invoice(system: &mut System, invoice_id: u64, claim_hash: Bytes) {
    system.env.set_caller(system.owner);
    system.pool.submit_invoice(
        invoice_id,
        U256::from(INVOICE_AMOUNT),
        system.vendor,
        claim_hash,
    );
}

fn execute(system: &mut System, invoice_id: u64, claim_hash: Bytes) -> u64 {
    system.env.set_caller(system.agent);
    let action_id = system.controller.initiate_action(
        invoice_id,
        claim_hash,
        U256::from(INVOICE_AMOUNT),
        Bytes::from(vec![9u8; 32]),
    );
    system.controller.post_bond(action_id);
    system.controller.execute_action(action_id);
    action_id
}

#[test]
fn rejects_a_challenge_without_contract_proof() {
    let mut system = setup();
    let claim = Bytes::from(vec![1u8; 32]);
    submit_invoice(&mut system, 3000, claim.clone());
    let action_id = execute(&mut system, 3000, claim);

    system.env.set_caller(system.challenger);
    assert_eq!(
        system
            .controller
            .try_challenge_action(action_id)
            .expect_err("a unique claim is not challengeable"),
        Error::NotDuplicate.into()
    );
    assert_eq!(
        system.controller.get_action(action_id).status,
        ActionStatus::Executed
    );
    assert_eq!(
        system.vault.get_bond(action_id).status,
        BondStatus::Locked
    );
}

#[test]
fn slashes_a_proven_duplicate_and_counts_only_the_received_reserve() {
    let mut system = setup();
    let claim = Bytes::from(vec![2u8; 32]);
    submit_invoice(&mut system, 1045, claim.clone());
    submit_invoice(&mut system, 1046, claim.clone());
    let first_action = execute(&mut system, 1045, claim.clone());
    let duplicate_action = execute(&mut system, 1046, claim);
    assert!(!system.pool.is_action_duplicate(first_action));
    assert!(system.pool.is_action_duplicate(duplicate_action));

    system.env.set_caller(system.challenger);
    system.controller.challenge_action(duplicate_action);
    assert_eq!(
        system.controller.get_action(duplicate_action).status,
        ActionStatus::Challenged
    );
    system.controller.resolve_action(duplicate_action);

    assert_eq!(
        system.controller.get_action(duplicate_action).status,
        ActionStatus::ResolvedSlash
    );
    assert_eq!(
        system.vault.get_bond(duplicate_action).status,
        BondStatus::Slashed
    );
    assert_eq!(
        system.token.balance_of(&system.challenger),
        U256::from(BOND_AMOUNT / 2)
    );
    assert_eq!(
        system.pool.reserve_balance(),
        U256::from(BOND_AMOUNT / 2)
    );
    assert_eq!(
        system.token.balance_of(&system.pool.address()),
        U256::from(2 * INVOICE_AMOUNT + BOND_AMOUNT / 2)
    );

    let reputation = system.controller.get_reputation(system.agent);
    assert_eq!(reputation.clean, 0);
    assert_eq!(reputation.slashed, 1);
    assert_eq!(reputation.score, -50);
    assert_eq!(
        system
            .controller
            .get_bond_required(U256::from(INVOICE_AMOUNT), system.agent),
        U256::from(25 * UNIT)
    );
}

#[test]
fn refunds_an_expired_clean_action_and_improves_reputation() {
    let mut system = setup();
    let claim = Bytes::from(vec![3u8; 32]);
    submit_invoice(&mut system, 4000, claim.clone());
    let action_id = execute(&mut system, 4000, claim);
    let balance_while_locked = system.token.balance_of(&system.agent);

    assert_eq!(
        system
            .controller
            .try_resolve_action(action_id)
            .expect_err("clean action cannot resolve before expiry"),
        Error::WindowStillOpen.into()
    );
    system.env.advance_block_time(300_001);
    system.controller.resolve_action(action_id);

    assert_eq!(
        system.controller.get_action(action_id).status,
        ActionStatus::ResolvedRefund
    );
    assert_eq!(
        system.vault.get_bond(action_id).status,
        BondStatus::Released
    );
    assert_eq!(
        system.token.balance_of(&system.agent),
        balance_while_locked + U256::from(BOND_AMOUNT)
    );
    let reputation = system.controller.get_reputation(system.agent);
    assert_eq!(reputation.clean, 1);
    assert_eq!(reputation.slashed, 0);
    assert_eq!(reputation.score, 10);
}
