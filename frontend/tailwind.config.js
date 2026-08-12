/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F2A22',
        bg2: '#153A2D',
        bg3: '#1C4739',
        bg4: '#234f40',
        paper: '#F7F2E4',
        paper2: '#EFE7D2',
        turmeric: '#E7A72C',
        'turmeric-dim': '#9c7626',
        clay: '#C1622E',
        sky: '#5FA8C7',
        sprout: '#8FBF5C',
        text: '#F3EFE2',
        'text-dim': '#AFC3B5',
        ink: '#1B2E27',
        'ink-dim': '#5b6d64',
        danger: '#E07A5F',
        line: 'rgba(243,239,226,0.14)',
        'line-paper': 'rgba(27,46,39,0.12)',
        
        // Category badge colors
        'cat-income-bg': '#e7d9ba',
        'cat-income-text': '#6b4b12',
        'cat-insurance-bg': '#cfe3ea',
        'cat-insurance-text': '#245064',
        'cat-credit-bg': '#e3d3f0',
        'cat-credit-text': '#5a3480',
        'cat-soil-bg': '#ddebd0',
        'cat-soil-text': '#3c6321',
        'cat-irrigation-bg': '#c9e6f0',
        'cat-irrigation-text': '#1c5a72',
        'cat-marketing-bg': '#f0dcc9',
        'cat-marketing-text': '#8a4416',
        'cat-mechanization-bg': '#dfe1e8',
        'cat-mechanization-text': '#3a4152',
        'cat-women-bg': '#f3d6de',
        'cat-women-text': '#8f2f4f',
        'cat-food-bg': '#f5e2b8',
        'cat-food-text': '#7a5305',
        'cat-crop-bg': '#d9ecd1',
        'cat-crop-text': '#356121',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow': '0 8px 24px -8px rgba(231,167,44,0.5)',
        'glow-hover': '0 12px 28px -8px rgba(231,167,44,0.6)',
        'compare-bar': '0 12px 32px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        'card': '14px',
      }
    },
  },
  plugins: [],
}
