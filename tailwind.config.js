/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#090A09',
        'bg-soft': '#0D0F0D',
        surface: '#111311',
        'surface-2': '#151815',
        'surface-3': '#1A1D1A',
        line: '#252925',
        'line-strong': '#323732',
        text: '#F4F5EF',
        muted: '#8F968C',
        'muted-2': '#687067',
        accent: '#B8F35A',
        // Solid tokens keep Tailwind opacity modifiers (/10, /50, ...) predictable.
        // Values are tuned for readable accent surfaces on the dark theme.
        'accent-soft': '#26351A',
        'accent-border': '#526C35',
        profit: '#39D98A',
        'profit-soft': 'rgba(57, 217, 138, 0.12)',
        loss: '#FF665F',
        'loss-soft': 'rgba(255, 102, 95, 0.12)',
        amber: '#E8C86A',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
