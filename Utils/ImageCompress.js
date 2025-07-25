const sharp = require("sharp");
const compressImage = async (buffer, targetSizeKB = 100) => {
  let quality = 80; // Start with a reasonable quality
  let compressedBuffer = buffer;

  while (true) {
    compressedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      }) // Resize for reasonable dimensions
      .jpeg({ quality, mozjpeg: true }) // Compress using JPEG
      .toBuffer();

    const sizeKB = compressedBuffer.length / 1024; // Get size in KB
    if (sizeKB <= targetSizeKB || quality <= 10) {
      break; // Stop when the size is under the target or quality is too low
    }
    quality -= 5; // Reduce quality for further compression
  }

  return compressedBuffer;
};

module.exports = { compressImage };
