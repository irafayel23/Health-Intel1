module.exports = {
  content: ['../../mho.html', '../../assets/js/shared/**/*.js', '../../assets/js/mho/**/*.js'],
  darkMode: 'class',
  plugins: [require('./select-chevron.cjs'), require('./role-readability.cjs'), require('./clinical-readability.cjs'), require('./mho-walkin-dialog.cjs'), require('./laptop-spacing.cjs')],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))', background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))', card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))', muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))'
      }
    }
  }
};
