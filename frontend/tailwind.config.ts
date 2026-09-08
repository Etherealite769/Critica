import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#2b2b2b',
        'bg-darker': '#1e1e1e',
        'panel-bg': '#3a3a3a',
        'content-bg': '#c8c4bc',
        'card-bg': '#f0ece4',
        'card-bg2': '#e8e4dc',
        'sidebar-card': '#d0ccc4',
        'text-dark': '#111',
        'text-mid': '#444',
        'text-muted': '#777',
        'text-light': '#eee',
        accent: {
          green: '#4ddd94',
          blue: '#55aaff',
          orange: '#ff6b35',
          yellow: '#f5a623',
        },
      },
      fontFamily: {
        mono: ["'Share Tech Mono'", "'Courier New'", 'monospace'],
        serif: ["'Courier Prime'", "'Courier New'", 'monospace'],
        vt323: ["'VT323'", 'monospace'],
      },
      spacing: {
        'px': '1px',
      },
    },
  },
  plugins: [],
};

export default config;
