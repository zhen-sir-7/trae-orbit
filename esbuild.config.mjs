// esbuild 配置：把后端 api/index.ts 打包成单文件 dist-server/server.mjs
// 作为 Tauri 桌面端的后端 sidecar（用 node 运行）
// 策略：node 内置模块（含 node:* 前缀和裸名）保持 external，
//       其余依赖（express/ws/bonjour-service/nanoid/zod/cors）全部打进 bundle
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Node.js 所有内置模块列表（裸名）
const nodeBuiltins = [
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "http", "http2", "https", "inspector", "module", "net",
  "os", "path", "perf_hooks", "process", "punycode", "querystring",
  "readline", "repl", "stream", "string_decoder", "sys", "timers", "tls",
  "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads",
  "zlib", "sqlite",
];

// 同时匹配裸名和 node: 前缀
const externalList = [
  ...nodeBuiltins,
  ...nodeBuiltins.map((b) => `node:${b}`),
];

await build({
  entryPoints: [resolve(__dirname, "api/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: resolve(__dirname, "dist-server/server.mjs"),
  // node 内置模块（裸名 + node: 前缀）保持 external，不能打包进 bundle
  external: externalList,
  // 读取 tsconfig.json 的 paths 配置（@shared/*、@/*），处理路径别名
  tsconfig: resolve(__dirname, "tsconfig.json"),
  // 生成 sourcemap 便于调试
  sourcemap: true,
  legalComments: "none",
  banner: {
    // 在 ESM 上下文中注入可用的 require（用 createRequire），
    // 这样 esbuild 的 __require shim 能正常调用 node 内置模块
    js: [
      "// 由 esbuild.config.mjs 自动生成，请勿手动编辑",
      "import { createRequire } from 'node:module';",
      "const require = createRequire(import.meta.url);",
    ].join("\n"),
  },
});

console.log("✓ 后端 bundle 已生成: dist-server/server.mjs");
console.log("  运行方式: node dist-server/server.mjs");
