// require('dotenv').config({ quiet: true }); // ✅ suppress logs

require('dotenv').config();


const { app } = require('./app');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
