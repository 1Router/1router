use std::{fs, path::PathBuf};

fn main() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let src = manifest_dir.join("../../packages/models/models.json");
    let dst_dir = manifest_dir.join("catalog");
    let dst = dst_dir.join("models.json");

    if !src.exists() {
        panic!(
            "apps/api build script could not find the shared catalog at {}.\n\
             Make sure `packages/models/models.json` exists at the repo root.",
            src.display()
        );
    }

    fs::create_dir_all(&dst_dir).expect("create apps/api/catalog");
    fs::copy(&src, &dst).expect("copy packages/models/models.json -> apps/api/catalog/models.json");

    // Re-run when the shared catalog changes.
    println!("cargo:rerun-if-changed=../../packages/models/models.json");
    println!("cargo:rerun-if-changed=build.rs");
}
