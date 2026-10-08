import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let dbReady;

export default async function handler(req, res) {
  try {
    dbReady ||= connectDB();
    await dbReady;
    return app(req, res);
  } catch (error) {
    dbReady = null;
    console.error("FoodGo serverless request failed:", error);

    return res.status(503).json({
      success: false,
      message: "FoodGo backend is temporarily unavailable.",
      code: "BACKEND_UNAVAILABLE",
    });
  }
}
