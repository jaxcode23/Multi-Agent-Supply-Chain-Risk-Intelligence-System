use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::Duration;

// 1. Define the structure of our TOML config
#[derive(Debug, Deserialize)]
struct Config {
    services: HashMap<String, ServiceConfig>,
}

#[derive(Debug, Deserialize)]
struct ServiceConfig {
    path: String,
    command: String,
    args: Vec<String>,
}

/// On Windows, resolve a command name to its full runnable path.
///
/// Strategy:
///   1. Try adding common Windows extensions (.cmd, .bat, .exe) first — this
///      ensures `npm` resolves to `npm.cmd` instead of the bare Unix script.
///   2. Search an augmented PATH that includes tool-manager bin dirs derived
///      purely from environment variables (LOCALAPPDATA, APPDATA) — no hardcoding.
#[cfg(target_os = "windows")]
fn resolve_command_windows(command: &str) -> Option<String> {
    // If the caller already specified an extension, use as-is. Otherwise probe
    // Windows-native extensions in order of preference.
    let candidates: Vec<String> = if std::path::Path::new(command).extension().is_some() {
        vec![command.to_string()]
    } else {
        vec![
            format!("{}.cmd", command),  // npm, yarn, pnpm, etc.
            format!("{}.bat", command),  // sbt, coursier tools, etc.
            format!("{}.exe", command),  // standard executables
            command.to_string(),         // last-resort fallback
        ]
    };

    // Augment PATH with well-known tool-manager bin directories, derived
    // entirely from environment variables — zero hardcoded paths.
    let mut extra_paths: Vec<String> = Vec::new();
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        // Coursier (Scala toolchain): installs sbt.bat, scala.bat, etc. here
        extra_paths.push(format!("{}\\Coursier\\data\\bin", local));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        // npm global installs land here sometimes
        extra_paths.push(format!("{}\\npm", appdata));
    }

    let current_path = std::env::var("PATH").unwrap_or_default();
    let augmented_path = format!("{};{}", extra_paths.join(";"), current_path);

    for candidate in &candidates {
        let result = Command::new("where.exe")
            .arg(candidate)
            .env("PATH", &augmented_path)
            .output();

        if let Ok(output) = result {
            if output.status.success() {
                if let Some(line) = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .map(|l| l.trim().to_string())
                {
                    return Some(line);
                }
            }
        }
    }

    None
}


// 2. The Spawner Function
fn spawn_service(name: &str, config: &ServiceConfig) -> Option<Child> {
    println!("🚀 Starting [{}] from {}", name, config.path);

    // Dynamically resolve the real executable path at runtime.
    // On Windows, use `where.exe` to find the full path (handles PATH gaps,
    // .bat / .cmd wrappers, Coursier installs, etc.) with zero hardcoding.
    #[cfg(target_os = "windows")]
    let (final_command, final_args) = {
        let resolved = resolve_command_windows(&config.command)
            .unwrap_or_else(|| config.command.clone());

        let lower = resolved.to_lowercase();
        if lower.ends_with(".bat") || lower.ends_with(".cmd") {
            // .bat and .cmd files must be launched via `cmd /c` on Windows —
            // Rust's Command cannot spawn them directly.
            let args: Vec<String> = std::iter::once("/C".to_string())
                .chain(std::iter::once(resolved))
                .chain(config.args.iter().cloned())
                .collect();
            ("cmd".to_string(), args)
        } else {
            (resolved, config.args.clone())
        }
    };

    #[cfg(not(target_os = "windows"))]
    let (final_command, final_args) = (config.command.clone(), config.args.clone());

    match Command::new(&final_command)
        .args(&final_args)
        .current_dir(&config.path)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
    {
        Ok(child) => Some(child),
        Err(e) => {
            eprintln!("❌ Failed to start [{}]: {}", name, e);
            eprintln!("   Command: {} {:?}", final_command, final_args);
            None
        }
    }
}


fn main() {
    println!("🦀 Runner: Initializing Workspace...\n");

    let current_dir = env::current_dir().expect("Failed to get current directory");
    let mut config_path = current_dir.join("runner.toml");

    // If runner.toml is not in the current directory, check the parent directory.
    // This allows running `cargo run` directly from within the `runner/` directory itself.
    if !config_path.exists() {
        if let Some(parent) = current_dir.parent() {
            let parent_config = parent.join("runner.toml");
            if parent_config.exists() {
                config_path = parent_config;
                // Change the working directory so relative paths in TOML (like ./backend) resolve correctly against the root folder
                if let Err(e) = env::set_current_dir(parent) {
                    eprintln!("❌ Failed to change working directory to parent: {}", e);
                    return;
                }
            }
        }
    }

    // 3. Read and Parse the Config File
    let config_contents = match fs::read_to_string(&config_path) {
        Ok(contents) => contents,
        Err(_) => {
            eprintln!("❌ Could not find runner.toml in the current directory.");
            eprintln!("Please create it to define your services.");
            return;
        }
    };

    let config: Config = match toml::from_str(&config_contents) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("❌ Failed to parse runner.toml: {}", e);
            return;
        }
    };

    let mut running_processes: Vec<Child> = Vec::new();

    // 4. Spawn all configured services
    for (name, service_config) in &config.services {
        if let Some(child) = spawn_service(name, service_config) {
            running_processes.push(child);
        }
    }

    if running_processes.is_empty() {
        println!("⚠️ No services were successfully started.");
        return;
    }

    println!("\n✅ All configured services spawned. Press Ctrl+C to terminate.");

    // Keep the main thread alive so the child processes stay open
    loop {
        thread::sleep(Duration::from_secs(1));
    }
}
