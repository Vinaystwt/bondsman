use bond_vault_v2::bond_vault_v2::{BondVaultV2, BondVaultV2InitArgs};
use bond_vault::bond_vault::BondVault;
use bondsman_controller_v2::bondsman_controller_v2::{BondsmanControllerV2, BondsmanControllerV2InitArgs};
use bondsman_controller::bondsman_controller::BondsmanController;
use delivery_contradiction_verifier_v2::delivery_contradiction_verifier_v2::DeliveryContradictionVerifierV2;
use duplicate_claim_verifier_v2::duplicate_claim_verifier_v2::DuplicateClaimVerifierV2;
use invoice_pool_v2::invoice_pool_v2::{InvoicePoolV2, InvoicePoolV2InitArgs};
use invoice_pool::invoice_pool::InvoicePool;
use mock_cspr_usd::mock_cspr_usd::MockCsprUSD;
use odra::{casper_types::U256, host::{HostEnv, NoArgs}, prelude::Addressable};
use odra_cli::{deploy::{DeployScript, Error}, DeployedContractsContainer, DeployerExt, OdraCli};

const INSTALL_GAS: u64 = 350_000_000_000;
const CALL_GAS: u64 = 50_000_000_000;
const UNIT: u64 = 1_000_000_000;

struct V2Deploy;
impl DeployScript for V2Deploy {
    fn deploy(&self, env: &HostEnv, container: &mut DeployedContractsContainer) -> Result<(), Error> {
        let deployer = env.get_account(0); let agent = env.get_account(1);
        let mut token = MockCsprUSD::load_or_deploy(env, NoArgs, container, INSTALL_GAS)?;
        let mut vault = BondVaultV2::load_or_deploy(env, BondVaultV2InitArgs { controller: deployer, token: token.address() }, container, INSTALL_GAS)?;
        let mut controller = BondsmanControllerV2::load_or_deploy(env, BondsmanControllerV2InitArgs { vault: vault.address(), pool: deployer, token: token.address(), window_secs: 1_800, challenger_bps: 5_000 }, container, INSTALL_GAS)?;
        let mut pool = InvoicePoolV2::load_or_deploy(env, InvoicePoolV2InitArgs { controller: controller.address(), token: token.address() }, container, INSTALL_GAS)?;
        let duplicate = DuplicateClaimVerifierV2::load_or_deploy(env, NoArgs, container, INSTALL_GAS)?;
        let delivery = DeliveryContradictionVerifierV2::load_or_deploy(env, NoArgs, container, INSTALL_GAS)?;
        env.set_gas(CALL_GAS); vault.set_controller(controller.address());
        env.set_gas(CALL_GAS); controller.set_pool(pool.address());
        env.set_gas(CALL_GAS); pool.set_controller(controller.address());
        env.set_gas(CALL_GAS); controller.register_verifier("duplicate_claim".to_string(), duplicate.address());
        env.set_gas(CALL_GAS); controller.register_verifier("delivery_contradiction".to_string(), delivery.address());
        env.set_gas(CALL_GAS); token.mint(agent, U256::from(500_000 * UNIT));
        env.set_gas(CALL_GAS); token.mint(pool.address(), U256::from(2_000_000 * UNIT)); env.set_gas(0); Ok(())
    }
}
fn main() { OdraCli::new().about("Bondsman V2 deployment and operations").deploy(V2Deploy).contract::<MockCsprUSD>().contract::<BondVault>().contract::<BondsmanController>().contract::<InvoicePool>().contract::<BondVaultV2>().contract::<BondsmanControllerV2>().contract::<InvoicePoolV2>().contract::<DuplicateClaimVerifierV2>().contract::<DeliveryContradictionVerifierV2>().build().run(); }
