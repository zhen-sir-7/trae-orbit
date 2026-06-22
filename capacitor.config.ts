import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor 配置：把手机端 web app（phone.html 入口）打包成 Android 应用
// 打包后的前端静态资源由 Capacitor WebView 加载（capacitor://localhost 或 https://localhost）
// API 通过 localStorage 的 orbit_api_base 键指向 PC 后端地址（如 http://192.168.1.100:8787）
const config: CapacitorConfig = {
  appId: 'com.trae.orbit',
  appName: 'TRAE Orbit',
  webDir: 'dist',
  server: {
    // 开发时使用 https scheme，避免混合内容限制
    androidScheme: 'https',
  },
  android: {
    // 允许 http 后端（局域网 PC 节点），配合 AndroidManifest 的 usesCleartextTraffic
    allowMixedContent: true,
  },
};

export default config;
