use invoice_pool::invoice_pool::{Error, InvoicePool, InvoicePoolInitArgs};
use mock_cspr_usd::mock_cspr_usd::MockCsprUSD;
use odra::casper_types::{bytesrepr::Bytes, U256};
use odra::host::{Deployer, NoArgs};
use odra::prelude::Addressable;

#[test]
fn pays_both_invoices_and_proves_only_the_second_claim_is_duplicate() {
    let env = odra_test::env();
    let controller = env.get_account(1);
    let vendor_a = env.get_account(2);
    let vendor_b = env.get_account(3);
    let claim_hash = Bytes::from(vec![7u8; 32]);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut pool = InvoicePool::deploy(
        &env,
        InvoicePoolInitArgs {
            controller,
            token: token.address(),
        },
    );

    pool.submit_invoice(1045, U256::from(400u64), vendor_a, claim_hash.clone());
    pool.submit_invoice(1046, U256::from(600u64), vendor_b, claim_hash.clone());
    token.mint(pool.address(), U256::from(1_000u64));

    env.set_caller(controller);
    pool.payout(1045, 10, claim_hash.clone(), U256::from(400u64));
    pool.payout(1046, 11, claim_hash, U256::from(600u64));

    assert_eq!(token.balance_of(&vendor_a), U256::from(400u64));
    assert_eq!(token.balance_of(&vendor_b), U256::from(600u64));
    assert!(!pool.is_action_duplicate(10));
    assert!(pool.is_action_duplicate(11));
    assert!(pool.get_invoice(1045).paid);
    assert!(pool.get_invoice(1046).paid);
}

#[test]
fn rejects_non_controller_payouts_and_tracks_reserve_without_a_transfer() {
    let env = odra_test::env();
    let controller = env.get_account(1);
    let vendor = env.get_account(2);
    let claim_hash = Bytes::from(vec![8u8; 32]);
    let token = MockCsprUSD::deploy(&env, NoArgs);
    let mut pool = InvoicePool::deploy(
        &env,
        InvoicePoolInitArgs {
            controller,
            token: token.address(),
        },
    );
    pool.submit_invoice(2000, U256::from(100u64), vendor, claim_hash.clone());

    assert_eq!(
        pool.try_payout(2000, 1, claim_hash, U256::from(100u64))
            .expect_err("deployer is not the controller"),
        Error::NotController.into()
    );

    env.set_caller(controller);
    pool.add_to_reserve(U256::from(75u64));
    assert_eq!(pool.reserve_balance(), U256::from(75u64));
    assert_eq!(token.balance_of(&pool.address()), U256::zero());
}
