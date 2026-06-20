const mongoose = require("mongoose");

const { mongodbUri } = require("./env");

let connectionPromise;

// Explain me this?
// This code is a configuration file for connecting to a MongoDB database using Mongoose,
// which is an Object Data Modeling (ODM) library for MongoDB and Node.js.

// The `connectDB` function is an asynchronous function that establishes a connection
// to the MongoDB database using the `mongoose.connect()` method. The connection string
// now comes from the MONGODB_URI environment variable, with a local devstinder database
// fallback from src/config/env.js.

// devstinder is the name of the database that you want to connect to. When you call the
// `connectDB` function, it will attempt to connect to MongoDB using the configured
// connection string, and if successful, it will allow your application to interact with
// the database for performing CRUD operations and other database-related tasks.
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Reuse the same in-flight connection promise if multiple parts of the app try to
  // connect at the same time.
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongodbUri);
  }

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
};

// This helper is mainly used by automated tests and local scripts so the Node process
// can shut down cleanly after the server is stopped.
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
