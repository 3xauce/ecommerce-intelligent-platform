/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Le "preflight" de Tailwind est désactivé pour ne pas entrer en conflit
  // avec le CssBaseline de Material UI (les deux réinitialisent le CSS de
  // base) : MUI gère le reset, Tailwind ne fournit que les utilitaires.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
