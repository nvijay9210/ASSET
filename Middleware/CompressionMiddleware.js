// /middlewares/compressionMiddleware.js
const { compressBrotli } = require('../utils/compressionUtils');

const compressionMiddleware = async (req, res, next) => {
  // Check if the client supports Brotli compression
  const acceptEncoding = req.headers['accept-encoding'];

  // If the client supports Brotli, compress the data
  if (acceptEncoding && acceptEncoding.includes('br')) {
    const originalSend = res.send;

    res.send = async (data) => {
      try {
        const compressedData = await compressBrotli(data);
        res.setHeader('Content-Encoding', 'br');
        originalSend.call(res, compressedData);
      } catch (err) {
        console.error('Compression error:', err);
        res.status(500).send({ error: 'Compression failed.' });
      }
    };
  }

  next();
};

module.exports = compressionMiddleware;
