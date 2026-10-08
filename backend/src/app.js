import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import mongoose from "mongoose";
import { User } from "./models/User.js";
import { Restaurant } from "./models/Restaurant.js";
import { MenuItem } from "./models/MenuItem.js";
import { Order } from "./models/Order.js";
import { Payment } from "./models/Payment.js";
import { Delivery } from "./models/Delivery.js";
import { Notification } from "./models/Notification.js";
import { connectDB, isDBConnected, getDBState } from "./config/db.js";
const app = express();
app.use(helmet());
const allowedOrigins = new Set(
  (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, "");
  if (allowedOrigins.has(normalized)) return true;

  try {
    const url = new URL(normalized);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }

    // Allow Vercel preview deployments while keeping production CORS restricted
    // to the CLIENT_URL value above.
    if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) {
      return true;
    }
  } catch {}

  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(cookieParser());
app.get("/api/health", (req, res) => res.json({
  success: true,
  service: "FoodGo API",
  status: "healthy",
  timestamp: new Date().toISOString(),
}));
app.get("/api/health/db", async (req, res) => {
  try {
    await connectDB();
    const collections = {
      users: await User.countDocuments(),
      restaurants: await Restaurant.countDocuments(),
      menuitems: await MenuItem.countDocuments(),
      orders: await Order.countDocuments(),
      payments: await Payment.countDocuments(),
      deliveries: await Delivery.countDocuments(),
      notifications: await Notification.countDocuments(),
    };
    return res.json({
      success: true,
      database: mongoose.connection.name || "unknown",
      state: isDBConnected() ? "connected" : "disconnected",
      connection: getDBState(),
      collections,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      database: mongoose.connection.name || "unknown",
      state: "disconnected",
      code: "DATABASE_UNAVAILABLE",
      message: "MongoDB is not reachable. Check MONGO_URI, Atlas Network Access, database credentials, and DNS.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

// Never let database-backed controllers run while MongoDB is disconnected.
// Mongoose buffering is disabled, so every request must have a live connection.
app.use(async (req, res, next) => {
  if (req.path === "/api/health" || req.path === "/api/health/db") return next();

  try {
    if (!isDBConnected()) await connectDB();
    if (!isDBConnected()) throw new Error("MongoDB connection is not ready.");
    return next();
  } catch (error) {
    console.error("MongoDB unavailable for request:", error.message);
    return res.status(503).json({
      success: false,
      code: "DATABASE_UNAVAILABLE",
      message: "FoodGo database is unavailable. Check MONGO_URI, MongoDB Atlas Network Access, credentials, and DNS.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", publicRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.get("/", (req, res) => res.json({ success: true, service: "FoodGo API", message: "FoodGo backend is running" }));
app.use((req, res) => res.status(404).json({
  success: false,
  message: `Route not found: ${req.method} ${req.originalUrl}`,
}));
app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);
  const message = error?.message || "Internal server error";
  const dbError = /buffering timed out|MongoServerSelectionError|MongoNetworkError|not connected|topology/i.test(message);
  res.status(dbError ? 503 : (error.status || 500)).json({
    success: false,
    code: dbError ? "DATABASE_UNAVAILABLE" : undefined,
    message: dbError
      ? "FoodGo database is unavailable. Check MongoDB Atlas connection settings."
      : message,
    detail: process.env.NODE_ENV === "production" ? undefined : message,
  });
});
export default app;
