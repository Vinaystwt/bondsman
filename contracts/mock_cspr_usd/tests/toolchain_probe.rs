use mock_cspr_usd::toolchain_probe::{ToolchainProbe, ToolchainProbeInitArgs};
use odra::host::Deployer;

#[test]
fn stores_the_initial_value() {
    let env = odra_test::env();
    let probe = ToolchainProbe::deploy(&env, ToolchainProbeInitArgs { value: 42 });

    assert_eq!(probe.value(), 42);
}

