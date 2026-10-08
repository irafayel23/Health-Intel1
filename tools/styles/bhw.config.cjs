const base = require('./tailwind.config.cjs');
module.exports = {
  ...base,
  content: ['../../bhw.html', '../../assets/js/shared/**/*.js', '../../assets/js/bhw/**/*.js']
};
