import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
if (!uri) {
  console.error("MONGO_URI is missing. Create backend/.env from backend/.env.example.");
  process.exit(1);
}

try {
  console.log("Testing MongoDB Atlas connection...");
  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    family: 4,
    bufferCommands: false,
  });
  await connection.connection.db.admin().ping();
  console.log(`MongoDB connection OK: ${connection.connection.host}/${connection.connection.name}`);
  console.log("MongoDB ping OK.");
} catch (error) {
  console.error("MongoDB connection FAILED:");
  console.error(error.message);
  console.error("Check: 1) fresh Atlas connection string, 2) database user/password, 3) Atlas Network Access, 4) Windows DNS.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
