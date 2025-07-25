const path = require('path');
// // Absolute file path
// const absolutePath = 'E:\\CODING LANGUAGES\\BRIGHTON\\GOLDLOANPROJECT\\uploads\\images\\file.jpg';

// Base directory to make relative
const baseDir = process.env.PHOTO_URL;

// Convert to relative path
async function relativePath(absolutePath){return path.relative(baseDir, absolutePath).replace(/\\/g, '/')} ;

// const relativePath=async(absolutePath)=>{
//     const relative = absolutePath.split('uploads/')[1];
//     return `upload/${relative}`;
// }

module.exports={relativePath}