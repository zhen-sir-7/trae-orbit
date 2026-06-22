// TRAE Orbit 桌面端 Rust 入口
// 核心职责：在 Tauri setup 时启动后端 Node 子进程，让 webview 加载 localhost:8787
// dev 模式：npx tsx api/index.ts
// prod 模式：node <resource_dir>/server.mjs

use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

// 全局后端子进程状态，app 退出时用于 kill
struct BackendState {
    child: Mutex<Option<Child>>,
}

/// 启动后端 Node 子进程
/// 返回 (子进程 handle, 是否为 dev 模式)
fn start_backend(app: &tauri::App) -> Result<(Child, bool), Box<dyn std::error::Error>> {
    let is_dev = cfg!(debug_assertions);

    if is_dev {
        // dev 模式：用 npx tsx 直接运行 api/index.ts
        // 项目根目录 = CARGO_MANIFEST_DIR 的上一级（即 src-tauri/..）
        let project_root = env!("CARGO_MANIFEST_DIR");
        let project_root = std::path::Path::new(project_root).parent().unwrap();

        println!("[tauri] dev 模式：启动后端 npx tsx api/index.ts (cwd: {})", project_root.display());

        let child = if cfg!(target_os = "windows") {
            // Windows 上 npx 是 .cmd 文件，需要通过 cmd /c 调用
            Command::new("cmd")
                .args(["/c", "npx", "tsx", "api/index.ts"])
                .current_dir(project_root)
                .env("PORT", "8787")
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .spawn()?
        } else {
            Command::new("npx")
                .args(["tsx", "api/index.ts"])
                .current_dir(project_root)
                .env("PORT", "8787")
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .spawn()?
        };

        Ok((child, true))
    } else {
        // prod 模式：运行打包后的 dist-server/server.mjs（作为 resource 打包）
        let resource_dir = app.path().resource_dir()?;
        // Windows 上 resource_dir 可能返回 \\?\ 前缀的长路径，node 无法处理，需去掉
        let resource_dir_str = resource_dir.to_string_lossy();
        let resource_dir_clean = if let Some(stripped) = resource_dir_str.strip_prefix(r"\\?\") {
            std::path::PathBuf::from(stripped)
        } else {
            resource_dir
        };
        let server_script = resource_dir_clean.join("server.mjs");

        println!("[tauri] prod 模式：启动后端 node {} ", server_script.display());

        // prod 模式下数据目录：便携模式，默认放 exe 同目录的 data 文件夹
        // 支持通过 ORBIT_DATA_DIR 环境变量覆盖
        let data_dir = match std::env::var("ORBIT_DATA_DIR") {
            Ok(p) => std::path::PathBuf::from(p),
            Err(_) => {
                let exe = std::env::current_exe()?;
                exe.parent().unwrap().join("data")
            }
        };
        std::fs::create_dir_all(&data_dir)?;

        let child = Command::new("node")
            .arg(&server_script)
            .env("PORT", "8787")
            .env("DATA_DIR", &data_dir)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()?;

        Ok((child, false))
    }
}

/// 轮询后端端口（localhost:8787），等待后端就绪
/// 用 TcpStream 检测端口是否可连接，无需额外 HTTP 依赖
fn wait_for_backend(max_retries: u32) {
    let addr = "127.0.0.1:8787";
    for i in 0..max_retries {
        match TcpStream::connect_timeout(
            &addr.parse().expect("解析地址失败"),
            Duration::from_secs(1),
        ) {
            Ok(_) => {
                println!("[tauri] 后端已就绪（第 {} 次尝试）", i + 1);
                return;
            }
            Err(_) => {
                std::thread::sleep(Duration::from_millis(500));
            }
        }
    }
    println!("[tauri] 警告：后端在 {} 次尝试后仍未就绪，webview 可能无法正常加载", max_retries);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 启动后端子进程
            let (child, _is_dev) = start_backend(app)?;

            // 等待后端就绪（最多 15 秒：30 次 × 500ms）
            wait_for_backend(30);

            // 存储子进程 handle，供退出时 kill
            app.manage(BackendState {
                child: Mutex::new(Some(child)),
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // app 退出时 kill 后端子进程
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<BackendState>() {
                    if let Ok(mut guard) = state.child.lock() {
                        if let Some(child) = guard.as_mut() {
                            println!("[tauri] 退出：kill 后端子进程");
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                }
            }
        });
}
