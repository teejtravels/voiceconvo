// frontend/webpack.config.js
const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false
    }
  },
  ignoreWarnings: [
    {
      module: /onnxruntime-web/,
    }
  ]
};
