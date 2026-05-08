/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        beam: {
          black: '#101010',
          yellow: '#ffe45e',
          pink: '#ff6ba8',
          mint: '#62f2c8',
          cream: '#fff8df'
        }
      },
      boxShadow: {
        beam: '0 16px 45px rgba(255, 228, 94, 0.24)',
        crisp: '4px 4px 0 #101010'
      }
    }
  },
  plugins: []
};
