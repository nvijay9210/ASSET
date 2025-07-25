// /utils/compressionUtils.js
const zlib = require('zlib'); // Built-in Brotli support
// Alternatively, you can use `iltorb` if you prefer

const compressBrotli = (data) => {
  return new Promise((resolve, reject) => {
    zlib.brotliCompress(Buffer.from(data), (err, compressedData) => {
      if (err) {
        reject(err);
      } else {
        resolve(compressedData);
      }
    });
  });
};

module.exports = { compressBrotli };
