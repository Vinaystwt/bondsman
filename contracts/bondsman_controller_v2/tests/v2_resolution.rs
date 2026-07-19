use bond_vault_v2::bond_vault_v2::{BondStatusV2, BondVaultV2, BondVaultV2InitArgs};
use bondsman_controller_v2::bondsman_controller_v2::{ActionStatusV2, BondsmanControllerV2, BondsmanControllerV2InitArgs, Error};
use delivery_contradiction_verifier_v2::delivery_contradiction_verifier_v2::DeliveryContradictionVerifierV2;
use duplicate_claim_verifier_v2::duplicate_claim_verifier_v2::DuplicateClaimVerifierV2;
use invoice_pool_v2::invoice_pool_v2::{InvoicePoolV2, InvoicePoolV2InitArgs};
use mock_cspr_usd::mock_cspr_usd::MockCsprUSD;
use odra::casper_types::{bytesrepr::Bytes, U256};
use odra::host::{Deployer, NoArgs};
use odra::prelude::Addressable;
use ed25519_dalek::{Signer, SigningKey};

const UNIT: u64 = 1_000_000_000;

#[test]
fn v2_duplicate_verifier_slashes_the_second_paid_claim() {
    let env = odra_test::env();
    let owner = env.get_account(0); let agent = env.get_account(1); let challenger = env.get_account(2);
    let vendor_a = env.get_account(3); let vendor_b = env.get_account(4);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVaultV2::deploy(&env, BondVaultV2InitArgs { controller: owner, token: token.address() });
    let mut controller = BondsmanControllerV2::deploy(&env, BondsmanControllerV2InitArgs { vault: vault.address(), pool: owner, token: token.address(), window_secs: 1800, challenger_bps: 5000 });
    let mut pool = InvoicePoolV2::deploy(&env, InvoicePoolV2InitArgs { controller: controller.address(), token: token.address() });
    let duplicate = DuplicateClaimVerifierV2::deploy(&env, NoArgs);
    let delivery = DeliveryContradictionVerifierV2::deploy(&env, NoArgs);
    vault.set_controller(controller.address()); controller.set_pool(pool.address()); pool.set_controller(controller.address());
    controller.register_verifier("duplicate_claim".to_string(), duplicate.address());
    controller.register_verifier("delivery_contradiction".to_string(), delivery.address());
    let claim = Bytes::from(vec![7u8; 32]); let buyer = Bytes::from(vec![1u8; 32]);
    pool.submit_invoice(1, U256::from(50_000 * UNIT), vendor_a, claim.clone(), Bytes::from(vec![2u8;32]), 0, buyer.clone());
    pool.submit_invoice(2, U256::from(50_000 * UNIT), vendor_b, claim.clone(), Bytes::from(vec![3u8;32]), 0, buyer);
    token.mint(agent, U256::from(10_000 * UNIT)); token.mint(pool.address(), U256::from(200_000 * UNIT));
    env.set_caller(agent); token.approve(&vault.address(), &U256::from(5_000 * UNIT));
    let first = controller.initiate_action(1, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![4u8;32])); controller.post_bond(first); controller.execute_action(first);
    let second = controller.initiate_action(2, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![5u8;32])); controller.post_bond(second); controller.execute_action(second);
    assert!(pool.is_action_duplicate(second));
    env.set_caller(challenger); controller.challenge_action(second, "duplicate_claim".to_string(), Bytes::from(vec![]));
    assert_eq!(controller.get_action(second).status, ActionStatusV2::Challenged);
    controller.resolve_action(second);
    assert_eq!(controller.get_action(second).status, ActionStatusV2::ResolvedSlash);
    assert_eq!(vault.get_bond(second).status, BondStatusV2::Slashed);
    assert_eq!(token.balance_of(&challenger), U256::from(1_250 * UNIT));
    assert_eq!(pool.reserve_balance(), U256::from(1_250 * UNIT));
    assert_eq!(token.balance_of(&pool.address()), U256::from(101_250 * UNIT));
    assert_eq!(token.balance_of(&vault.address()), U256::from(2_500 * UNIT));
    assert_eq!(
        controller.try_resolve_action(second).expect_err("slash resolves once"),
        Error::InvalidStatus.into()
    );
}

#[test]
fn v2_duplicate_verifier_rejects_the_first_claim_and_unknown_faults() {
    let env = odra_test::env();
    let owner = env.get_account(0); let agent = env.get_account(1); let challenger = env.get_account(2);
    let vendor_a = env.get_account(3); let vendor_b = env.get_account(4);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVaultV2::deploy(&env, BondVaultV2InitArgs { controller: owner, token: token.address() });
    let mut controller = BondsmanControllerV2::deploy(&env, BondsmanControllerV2InitArgs { vault: vault.address(), pool: owner, token: token.address(), window_secs: 1800, challenger_bps: 5000 });
    let mut pool = InvoicePoolV2::deploy(&env, InvoicePoolV2InitArgs { controller: controller.address(), token: token.address() });
    let duplicate = DuplicateClaimVerifierV2::deploy(&env, NoArgs);
    vault.set_controller(controller.address()); controller.set_pool(pool.address()); pool.set_controller(controller.address());
    controller.register_verifier("duplicate_claim".to_string(), duplicate.address());
    let claim = Bytes::from(vec![8u8; 32]); let buyer = Bytes::from(vec![1u8; 32]);
    pool.submit_invoice(11, U256::from(50_000 * UNIT), vendor_a, claim.clone(), Bytes::from(vec![2u8;32]), 0, buyer.clone());
    pool.submit_invoice(12, U256::from(50_000 * UNIT), vendor_b, claim.clone(), Bytes::from(vec![3u8;32]), 0, buyer);
    token.mint(agent, U256::from(10_000 * UNIT)); token.mint(pool.address(), U256::from(200_000 * UNIT));
    env.set_caller(agent); token.approve(&vault.address(), &U256::from(5_000 * UNIT));
    let first = controller.initiate_action(11, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![4u8;32])); controller.post_bond(first); controller.execute_action(first);
    let second = controller.initiate_action(12, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![5u8;32])); controller.post_bond(second); controller.execute_action(second);

    env.set_caller(challenger);
    assert_eq!(
        controller.try_challenge_action(first, "duplicate_claim".to_string(), Bytes::from(vec![])).expect_err("first claim is not duplicate"),
        Error::FaultNotConfirmed.into()
    );
    assert_eq!(
        controller.try_challenge_action(second, "unknown_fault".to_string(), Bytes::from(vec![])).expect_err("unknown fault class is not registered"),
        Error::UnregisteredVerifier.into()
    );
    assert_eq!(controller.get_action(first).status, ActionStatusV2::Executed);
    assert_eq!(controller.get_action(second).status, ActionStatusV2::Executed);
}

#[test]
fn v2_clean_refund_waits_for_window_and_is_single_use() {
    let env = odra_test::env();
    let owner = env.get_account(0); let agent = env.get_account(1); let vendor = env.get_account(2);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVaultV2::deploy(&env, BondVaultV2InitArgs { controller: owner, token: token.address() });
    let mut controller = BondsmanControllerV2::deploy(&env, BondsmanControllerV2InitArgs { vault: vault.address(), pool: owner, token: token.address(), window_secs: 1800, challenger_bps: 5000 });
    let mut pool = InvoicePoolV2::deploy(&env, InvoicePoolV2InitArgs { controller: controller.address(), token: token.address() });
    vault.set_controller(controller.address()); controller.set_pool(pool.address()); pool.set_controller(controller.address());
    let claim = Bytes::from(vec![9u8; 32]);
    pool.submit_invoice(21, U256::from(50_000 * UNIT), vendor, claim.clone(), Bytes::from(vec![2u8;32]), 0, Bytes::from(vec![1u8;32]));
    token.mint(agent, U256::from(10_000 * UNIT)); token.mint(pool.address(), U256::from(100_000 * UNIT));
    env.set_caller(agent); token.approve(&vault.address(), &U256::from(5_000 * UNIT));
    let action = controller.initiate_action(21, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![4u8;32]));
    controller.post_bond(action);
    controller.execute_action(action);
    let locked_balance = token.balance_of(&agent);
    assert_eq!(
        controller.try_resolve_action(action).expect_err("cannot refund inside challenge window"),
        Error::WindowStillOpen.into()
    );
    env.advance_block_time(1_800_001);
    controller.resolve_action(action);
    assert_eq!(controller.get_action(action).status, ActionStatusV2::ResolvedRefund);
    assert_eq!(vault.get_bond(action).status, BondStatusV2::Released);
    assert_eq!(token.balance_of(&agent), locked_balance + U256::from(2_500 * UNIT));
    assert_eq!(
        controller.try_resolve_action(action).expect_err("refund resolves once"),
        Error::InvalidStatus.into()
    );
}

#[test]
fn v2_challenge_window_uses_millisecond_block_time() {
    let env = odra_test::env();
    let owner = env.get_account(0); let agent = env.get_account(1); let challenger = env.get_account(2);
    let vendor_a = env.get_account(3); let vendor_b = env.get_account(4);
    let mut token = MockCsprUSD::deploy(&env, NoArgs);
    let mut vault = BondVaultV2::deploy(&env, BondVaultV2InitArgs { controller: owner, token: token.address() });
    let mut controller = BondsmanControllerV2::deploy(&env, BondsmanControllerV2InitArgs { vault: vault.address(), pool: owner, token: token.address(), window_secs: 1800, challenger_bps: 5000 });
    let mut pool = InvoicePoolV2::deploy(&env, InvoicePoolV2InitArgs { controller: controller.address(), token: token.address() });
    let duplicate = DuplicateClaimVerifierV2::deploy(&env, NoArgs);
    vault.set_controller(controller.address()); controller.set_pool(pool.address()); pool.set_controller(controller.address());
    controller.register_verifier("duplicate_claim".to_string(), duplicate.address());
    let claim = Bytes::from(vec![10u8; 32]); let buyer = Bytes::from(vec![1u8; 32]);
    pool.submit_invoice(31, U256::from(50_000 * UNIT), vendor_a, claim.clone(), Bytes::from(vec![2u8;32]), 0, buyer.clone());
    pool.submit_invoice(32, U256::from(50_000 * UNIT), vendor_b, claim.clone(), Bytes::from(vec![3u8;32]), 0, buyer);
    token.mint(agent, U256::from(10_000 * UNIT)); token.mint(pool.address(), U256::from(200_000 * UNIT));
    env.set_caller(agent); token.approve(&vault.address(), &U256::from(5_000 * UNIT));
    let first = controller.initiate_action(31, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![4u8;32])); controller.post_bond(first); controller.execute_action(first);
    let second = controller.initiate_action(32, claim.clone(), U256::from(50_000 * UNIT), Bytes::from(vec![5u8;32])); controller.post_bond(second); controller.execute_action(second);
    let window_end = controller.get_action(second).window_end;
    assert_eq!(window_end, env.block_time() + 1_800_000);
    env.advance_block_time(1_800_001);
    env.set_caller(challenger);
    assert_eq!(
        controller.try_challenge_action(second, "duplicate_claim".to_string(), Bytes::from(vec![])).expect_err("window is measured in milliseconds"),
        Error::ChallengeWindowClosed.into()
    );
}

#[test]
fn delivery_verifier_requires_a_valid_bound_signature_and_consumes_the_nonce() {
    let env = odra_test::env(); let owner = env.get_account(0); let vendor = env.get_account(1);
    let token = MockCsprUSD::deploy(&env, NoArgs);
    let mut pool = InvoicePoolV2::deploy(&env, InvoicePoolV2InitArgs { controller: owner, token: token.address() });
    let mut verifier = DeliveryContradictionVerifierV2::deploy(&env, NoArgs);
    let signing = SigningKey::from_bytes(&[9u8; 32]); let public = signing.verifying_key().to_bytes();
    pool.submit_invoice(41, U256::from(1u64), vendor, Bytes::from(vec![8u8;32]), Bytes::from(vec![7u8;32]), 0, Bytes::from(public.to_vec()));
    let mut evidence = Vec::new(); evidence.extend_from_slice(&77u64.to_le_bytes()); evidence.extend_from_slice(&41u64.to_le_bytes()); evidence.extend_from_slice(&0u64.to_le_bytes()); evidence.extend_from_slice(&[5u8;32]);
    evidence.extend_from_slice(&signing.sign(&evidence).to_bytes()); let evidence = Bytes::from(evidence);
    assert!(verifier.verify(pool.address(), 77, 41, evidence.clone()));
    assert!(!verifier.verify(pool.address(), 77, 41, evidence));
}
