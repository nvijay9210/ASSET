const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const errorHandler = require('./Middleware/errorHandler');
const assetRouter = require('./Routes/AssetRouter');
const assetAllocationRouter = require('./Routes/AssetAllocationRouter');
const { redisconnect } = require('./Config/redisConfig');
const createTable = require('./Query/CreateModel'); // Uncomment if needed

// Initialize Express
const app = express();

// Middleware setup
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/files", express.static("uploads"));

// Redis connection
redisconnect();

// Optional: initialize DB tables
async function initializeTables() {
  try {
    await createTable.createAssetTable();
    await createTable.createAssetAllocationTable();
    await createTable.createDocumentTable();
    console.log('✅ Asset tables created.');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  }
}
// initializeTables(); // Uncomment only if required on startup

// require('./Query/AlterTable')

// Health check route
app.get('/test', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Successfully Running' });
});

// Routes
app.use('/asset', assetRouter);
app.use('/assetallocation', assetAllocationRouter);

// Error handler (always last)
app.use(errorHandler);

module.exports = { app };
