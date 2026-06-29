use odra::prelude::*;

#[odra::module]
pub struct ToolchainProbe {
    stored: Var<u64>,
}

#[odra::module]
impl ToolchainProbe {
    pub fn init(&mut self, value: u64) {
        self.stored.set(value);
    }

    pub fn value(&self) -> u64 {
        self.stored.get_or_default()
    }
}
