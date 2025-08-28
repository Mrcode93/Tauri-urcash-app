use std::path::Path;

fn main() {
    // Ensure the rust-server binary exists and is executable
    let binary_path = Path::new("bin/rust-server");
    if binary_path.exists() {
        println!("cargo:rustc-env=RUST_SERVER_PATH={}", binary_path.display());
        
        // On Unix systems, ensure the binary is executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = std::fs::metadata(&binary_path) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755); // rwxr-xr-x
                if let Err(e) = std::fs::set_permissions(&binary_path, perms) {
                    println!("cargo:warning=Could not set executable permissions on rust-server: {}", e);
                }
            }
        }
    } else {
        println!("cargo:warning=rust-server binary not found at {}", binary_path.display());
    }
    
    tauri_build::build()
}
