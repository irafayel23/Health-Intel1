module.exports = {
  content: ['../../admin.html', '../../assets/js/shared/**/*.js', '../../assets/js/admin/**/*.js'],
  plugins: [require('./select-chevron.cjs'), require('./role-readability.cjs')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sidebar: '#212631', contentBg: '#f3f4f7', brandBlue: '#3399ff',
        brandPurple: '#6f42c1', brandYellow: '#f9b115', brandRed: '#e55353'
      }
    }
  }
};
