/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 结构主义米色系
        sand: {
          50: "#FAF7F1", // 暖白卡片
          100: "#F5F0E6",
          200: "#EFEAE0", // 主背景米色
          300: "#E4DCC9",
          400: "#C9BC9C",
        },
        ink: {
          DEFAULT: "#1A1A1A", // 深炭黑
          soft: "#3A3A38",
          mute: "#6B6B66",
          line: "#1A1A1A14",
        },
        ochre: {
          DEFAULT: "#B85C38", // 赭石强调
          soft: "#D08560",
          deep: "#8A3F22",
        },
        moss: "#5C6B4A", // 在线/成功
        amber: "#C8893B", // 中风险/等待
        brick: "#A8442A", // 高风险
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        structural: '0.18em',
      },
      borderWidth: {
        hairline: '1px',
      },
      boxShadow: {
        none: 'none',
        structural: '4px 4px 0 0 #1A1A1A',
      },
    },
  },
  plugins: [],
};
