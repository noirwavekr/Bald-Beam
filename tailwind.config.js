/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        beam: {
          ink: '#4b3b2a',
          leaf: '#8bd867',
          meadow: '#c8ef9c',
          sky: '#9bdcf8',
          butter: '#ffe878',
          peach: '#ffb6a3',
          mint: '#9ff0d0',
          cream: '#fff8dc',
          paper: '#fffdf2'
        }
      },
      boxShadow: {
        beam: '0 18px 45px rgba(112, 144, 74, 0.18)',
        crisp: '4px 4px 0 #4b3b2a',
        soft: '0 12px 24px rgba(99, 126, 75, 0.18)'
      }
    }
  },
  plugins: []
};
