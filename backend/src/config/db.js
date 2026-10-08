import mongoose from "mongoose";

// Never allow Mongoose to queue database operations while MongoDB is offline.
// Without this, Model.find() can sit in the buffer for 10 seconds and produce
// the misleading: "Operation ... buffering timed out after 10000ms" error.
mongoose.set("bufferCommands", false);

let connectionPromise = null;
let lastUri = "";

const getUri = () => process.env.MONGO_URI || process.env.MONGODB_URI || "";

export const connectDB = async () => {
  const uri = getUri();
  if (!uri) throw new Error("MONGO_URI is missing from the environment.");

  // Reuse an already-open connection only when it belongs to the same URI.
  if (mongoose.connection.readyState === 1 && lastUri === uri) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise && lastUri === uri) {
    return connectionPromise;
  }

  if (mongoose.connection.readyState !== 0) {
    try { await mongoose.disconnect(); } catch {}
  }

  lastUri = uri;
  connectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 20000),
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
    family: 4,
    bufferCommands: false,
  }).then((connection) => {
    console.log(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
    return connection.connection;
  }).catch((error) => {
    connectionPromise = null;
    lastUri = "";
    throw error;
  });

  return connectionPromise;
};

export const isDBConnected = () => mongoose.connection.readyState === 1;

export const getDBState = () => ({
  readyState: mongoose.connection.readyState,
  readyStateName: ({0:"disconnected",1:"connected",2:"connecting",3:"disconnecting"})[mongoose.connection.readyState] || "unknown",
  host: mongoose.connection.host || "",
  name: mongoose.connection.name || "",
});

mongoose.connection.on("disconnected", () => {
  connectionPromise = null;
  lastUri = "";
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});
