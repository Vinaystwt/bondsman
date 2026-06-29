#![no_std]
#![cfg_attr(target_arch = "wasm32", no_main)]
#![allow(unused_imports, clippy::single_component_path_imports)]
use invoice_pool;

#[cfg(not(target_arch = "wasm32"))]
fn main() {}

