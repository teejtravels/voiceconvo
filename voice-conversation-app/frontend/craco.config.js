module.exports = {
    webpack: {
      configure: {
        ignoreWarnings: [
          {
            module: /onnxruntime-web/,
          },
        ],
      },
    },
  };