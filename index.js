const {app} = require('./app');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';

dotenv.config(); // Load base .env first
dotenv.config({ path: `.env.${env}` }); // Then env-specific override

const config = require('./Config/Config');

const PORT = process.env.PORT || 5000;

console.log(`Environment: ${env}`);
console.log(`Using DB Host: ${process.env.ASSET_DB_HOST}`);
console.log(`Server listening on port: ${PORT}`);
console.log('Loaded DB User:', process.env.ASSET_DB_USER);
console.log('Loaded DB Password:', process.env.ASSET_DB_PASS);
console.log('Loaded DB Host:', process.env.ASSET_DB_HOST);


app.listen(PORT, () => {
  console.log(`✅ Asset Server running on ${process.env.ASSET_DB_HOST} port ${PORT}`);
});
