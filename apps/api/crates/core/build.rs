use std::{fs, path::PathBuf};

fn main() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // crates/core -> ../../../../packages/models/models.json (repo root)
    let src = manifest_dir.join("../../../../packages/models/models.json");
    let dst_dir = manifest_dir.join("catalog");
    let dst = dst_dir.join("models.json");

    if !src.exists() {
        panic!(
            "core build script could not find the shared catalog at {}.\\n\
             Make sure `packages/models/models.json` exists at the repo root.",
            src.display()
        );
    }

    fs::create_dir_all(&dst_dir).expect("create core/catalog");
    fs::copy(&src, &dst).expect("copy models.json -> core/catalog/models.json");

    println!("cargo:rerun-if-changed=../../../../packages/models/models.json");
    println!("cargo:rerun-if-changed=build.rs");
}
