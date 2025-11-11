const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const errorHandler = require("./Middleware/errorHandler");
const assetRouter = require("./Routes/AssetRouter");
const assetAllocationRouter = require("./Routes/AssetAllocationRouter");
const createTable = require("./Query/CreateModel"); // Uncomment if needed

// Initialize Express
const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies / auth headers
  })
);

/*app.get("/api/load", (req, res) => {
  try {
    res.cookie("sample", "12345", { httpOnly: true });
    res.json({ token: "sample-jwt-token" });
  } catch (err) {
    console.error("Error in /api/load:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});*/

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/files", express.static("uploads"));

//redisconnecction
const { connect: redisConnect, closeRedis } = require("./Config/redisConfig");

// Optional: initialize DB tables
async function initializeTables() {
  try {
    await createTable.createAssetTable();
    await createTable.createAssetAllocationTable();
    await createTable.createDocumentTable();
    console.log("✅ Asset tables created.");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  }
}
// initializeTables(); // Uncomment only if required on startup

// require('./Query/AlterTable')

redisConnect().catch((err) => console.warn("Redis failed:", err.message));

// Health check route
app.get("/test", (req, res) => {
  res.status(200).json({ status: "OK", message: "Successfully Running" });
});

// Routes
app.use("/api/assetdashboard", assetRouter);
app.use("/api/assetallocation", assetAllocationRouter);

const JWT_SECRET = process.env.JWT_SECRET; // same as App A (32 bytes)

app.post("/api/load", (req, res) => {
  try {
    const { token } = req.body; // token from frontend
    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    // ✅ Don't parse it — it's already a string
    // console.log("Received token:", token);

    // verify JWT using your secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({ decoded });
  } catch (err) {
    console.error("JWT verify error:", err.message);
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
});


app.post("/api/tokensave", (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing access_token in request body" });
    }

    const cookieOptions = {
      httpOnly: true,         // prevents JS access
      secure: process.env.NODE_ENV === "production", // only over HTTPS in prod
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    };

    // ✅ Set access_token cookie
    res.cookie("access_token", access_token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Access token saved in cookie successfully",
    });
  } catch (error) {
    console.error("Error saving token:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Error handler (always last)
app.use(errorHandler);

module.exports = { app };
