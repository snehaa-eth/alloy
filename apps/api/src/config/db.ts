import mongoose from "mongoose";

// Defence in depth against NoSQL operator injection: any filter object that
// contains `$`-prefixed keys coming from user input is wrapped in `$eq`.
// Code that intentionally builds operator filters must use mongoose.trusted().
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

type Cache = { promise: Promise<typeof mongoose> | null };

// Cache the connection across hot invocations of the same serverless instance.
const globalForMongo = globalThis as typeof globalThis & { __alloyMongo?: Cache };
const cache: Cache = (globalForMongo.__alloyMongo ??= { promise: null });

export function connectDb(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5_000,
        maxPoolSize: 5,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next request
        throw err;
      });
  }
  return cache.promise;
}

export function dbState(): "disconnected" | "connected" | "connecting" | "disconnecting" | "unknown" {
  switch (mongoose.connection.readyState) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "unknown";
  }
}

export async function disconnectDb(): Promise<void> {
  cache.promise = null;
  await mongoose.disconnect();
}
