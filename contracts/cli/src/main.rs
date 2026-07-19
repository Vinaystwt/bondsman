use bond_vault::bond_vault::{BondVault, BondVaultInitArgs};
use bond_vault_v2::bond_vault_v2::BondVaultV2;
use bondsman_controller::bondsman_controller::{
    BondsmanController, BondsmanControllerInitArgs,
};
use bondsman_controller_v2::bondsman_controller_v2::BondsmanControllerV2;
use delivery_contradiction_verifier_v2::delivery_contradiction_verifier_v2::DeliveryContradictionVerifierV2;
use duplicate_claim_verifier_v2::duplicate_claim_verifier_v2::DuplicateClaimVerifierV2;
use invoice_pool::invoice_pool::{InvoicePool, InvoicePoolInitArgs};
use invoice_pool_v2::invoice_pool_v2::InvoicePoolV2;
use mock_cspr_usd::mock_cspr_usd::MockCsprUSD;
use odra::{
    casper_types::U256,
    host::{HostEnv, NoArgs},
    prelude::Addressable,
};
use odra_cli::{
    deploy::{DeployScript, Error},
    DeployedContractsContainer, DeployerExt, OdraCli,
};

const INSTALL_GAS: u64 = 350_000_000_000;
const CALL_GAS: u64 = 50_000_000_000;
const TOKEN_UNIT: u64 = 1_000_000_000;
const AGENT_MINT: u64 = 500_000 * TOKEN_UNIT;
const POOL_MINT: u64 = 2_000_000 * TOKEN_UNIT;

struct BondsmanDeploy;

impl DeployScript for BondsmanDeploy {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), Error> {
        let deployer = env.get_account(0);
        let agent = env.get_account(1);

        let mut token =
            MockCsprUSD::load_or_deploy(env, NoArgs, container, INSTALL_GAS)?;
        let mut vault = BondVault::load_or_deploy(
            env,
            BondVaultInitArgs {
                controller: deployer,
                token: token.address(),
            },
            container,
            INSTALL_GAS,
        )?;
        let mut controller = BondsmanController::load_or_deploy(
            env,
            BondsmanControllerInitArgs {
                vault: vault.address(),
                pool: deployer,
                token: token.address(),
                window_secs: 1_800,
                challenger_bps: 5_000,
            },
            container,
            INSTALL_GAS,
        )?;
        let pool = InvoicePool::load_or_deploy(
            env,
            InvoicePoolInitArgs {
                controller: controller.address(),
                token: token.address(),
            },
            container,
            INSTALL_GAS,
        )?;

        env.set_gas(CALL_GAS);
        vault.set_controller(controller.address());
        env.set_gas(CALL_GAS);
        controller.set_pool(pool.address());
        env.set_gas(CALL_GAS);
        token.mint(agent, U256::from(AGENT_MINT));
        env.set_gas(CALL_GAS);
        token.mint(pool.address(), U256::from(POOL_MINT));
        env.set_gas(0);
        Ok(())
    }
}

fn main() {
    OdraCli::new()
        .about("Bondsman contract deployment and operations")
        .deploy(BondsmanDeploy)
        .contract::<MockCsprUSD>()
        .contract::<BondVault>()
        .contract::<BondsmanController>()
        .contract::<InvoicePool>()
        .contract::<BondVaultV2>()
        .contract::<BondsmanControllerV2>()
        .contract::<InvoicePoolV2>()
        .contract::<DuplicateClaimVerifierV2>()
        .contract::<DeliveryContradictionVerifierV2>()
        .build()
        .run();
}
