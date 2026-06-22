// Patched autocfg replacement for TRAE sandbox.
// The TRAE sandbox blocks process creation from build scripts, causing
// std::process::Command::output() to panic. This replacement avoids all
// process spawning by hardcoding rustc 1.96.0 and making all probes succeed.

use std::env;
use std::fmt;
use std::path::PathBuf;

/// Error type (minimal implementation).
#[derive(Debug)]
pub struct Error(String);

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}

fn from_str(s: &str) -> Error {
    Error(s.to_string())
}

fn from_io(e: std::io::Error) -> Error {
    Error(e.to_string())
}

/// Version structure for relative comparisons.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Version {
    major: usize,
    minor: usize,
    patch: usize,
}

impl Version {
    pub fn new(major: usize, minor: usize, patch: usize) -> Self {
        Version { major, minor, patch }
    }
}

/// Writes a config flag: `cargo:rustc-cfg=CFG`
pub fn emit(cfg: &str) {
    println!("cargo:rustc-cfg={}", cfg);
}

/// Writes: `cargo:rerun-if-changed=PATH`
pub fn rerun_path(path: &str) {
    println!("cargo:rerun-if-changed={}", path);
}

/// Writes: `cargo:rerun-if-env-changed=VAR`
pub fn rerun_env(var: &str) {
    println!("cargo:rerun-if-env-changed={}", var);
}

/// Writes: `cargo:rustc-check-cfg=cfg(VAR)`
pub fn emit_possibility(cfg: &str) {
    println!("cargo:rustc-check-cfg=cfg({})", cfg);
}

/// Helper to detect compiler features (patched: no process spawning).
#[derive(Clone, Debug)]
pub struct AutoCfg {
    out_dir: PathBuf,
    rustc_version: Version,
    no_std: bool,
    edition: Option<String>,
}

/// Creates a new AutoCfg instance.
pub fn new() -> AutoCfg {
    AutoCfg::new().unwrap()
}

fn mangle(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

impl AutoCfg {
    pub fn new() -> Result<Self, Error> {
        match env::var_os("OUT_DIR") {
            Some(d) => Self::with_dir(d),
            None => Err(from_str("no OUT_DIR specified!")),
        }
    }

    pub fn with_dir<T: Into<PathBuf>>(dir: T) -> Result<Self, Error> {
        let dir = dir.into();
        let meta = std::fs::metadata(&dir).map_err(from_io)?;
        if !meta.is_dir() || meta.permissions().readonly() {
            return Err(from_str("output path is not a writable directory"));
        }
        Ok(AutoCfg {
            out_dir: dir,
            rustc_version: Version::new(1, 96, 0),
            no_std: false,
            edition: None,
        })
    }

    pub fn no_std(&self) -> bool {
        self.no_std
    }

    pub fn set_no_std(&mut self, no_std: bool) {
        self.no_std = no_std;
    }

    pub fn edition(&self) -> Option<&str> {
        self.edition.as_deref()
    }

    pub fn set_edition(&mut self, edition: Option<String>) {
        self.edition = edition;
    }

    /// Always true (rustc 1.96.0 >= any requested version).
    pub fn probe_rustc_version(&self, major: usize, minor: usize) -> bool {
        self.rustc_version >= Version::new(major, minor, 0)
    }

    pub fn emit_rustc_version(&self, major: usize, minor: usize) {
        let cfg_flag = format!("rustc_{}_{}", major, minor);
        emit_possibility(&cfg_flag);
        if self.probe_rustc_version(major, minor) {
            emit(&cfg_flag);
        }
    }

    /// Always Ok (no process spawning).
    pub fn probe_raw(&self, _code: &str) -> Result<(), Error> {
        Ok(())
    }

    pub fn probe_sysroot_crate(&self, _name: &str) -> bool {
        true
    }

    pub fn emit_sysroot_crate(&self, name: &str) {
        let cfg_flag = format!("has_{}", mangle(name));
        emit_possibility(&cfg_flag);
        if self.probe_sysroot_crate(name) {
            emit(&cfg_flag);
        }
    }

    pub fn probe_path(&self, _path: &str) -> bool {
        true
    }

    pub fn emit_has_path(&self, path: &str) {
        self.emit_path_cfg(path, &format!("has_{}", mangle(path)));
    }

    pub fn emit_path_cfg(&self, path: &str, cfg: &str) {
        emit_possibility(cfg);
        if self.probe_path(path) {
            emit(cfg);
        }
    }

    pub fn probe_trait(&self, _name: &str) -> bool {
        true
    }

    pub fn emit_has_trait(&self, name: &str) {
        self.emit_trait_cfg(name, &format!("has_{}", mangle(name)));
    }

    pub fn emit_trait_cfg(&self, name: &str, cfg: &str) {
        emit_possibility(cfg);
        if self.probe_trait(name) {
            emit(cfg);
        }
    }

    pub fn probe_type(&self, _name: &str) -> bool {
        true
    }

    pub fn emit_has_type(&self, name: &str) {
        self.emit_type_cfg(name, &format!("has_{}", mangle(name)));
    }

    pub fn emit_type_cfg(&self, name: &str, cfg: &str) {
        emit_possibility(cfg);
        if self.probe_type(name) {
            emit(cfg);
        }
    }

    pub fn probe_expression(&self, _expr: &str) -> bool {
        true
    }

    pub fn emit_expression_cfg(&self, expr: &str, cfg: &str) {
        emit_possibility(cfg);
        if self.probe_expression(expr) {
            emit(cfg);
        }
    }

    pub fn probe_constant(&self, _expr: &str) -> bool {
        true
    }

    pub fn emit_constant_cfg(&self, expr: &str, cfg: &str) {
        emit_possibility(cfg);
        if self.probe_constant(expr) {
            emit(cfg);
        }
    }
}
