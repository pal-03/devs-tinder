const mongoose = require("mongoose");
// Explain me this? 
// This code is a configuration file for connecting to a MongoDB database using Mongoose, which is an Object Data Modeling (ODM) library for MongoDB and Node.js.

// The `connectDB` function is an asynchronous function that establishes a connection to the MongoDB database using the `mongoose.connect()` method. The connection string provided in the `connect()` method includes the username, password, and the database name (devTinder) that you want to connect to.

// devsTinder is the name of the database that you want to connect to. In this case, it is specified in the connection string as part of the URL. When you call the `connectDB` function, it will attempt to connect to the MongoDB database using the provided connection string, and if successful, it will allow your application to interact with the database for performing CRUD operations and other database-related tasks.
const connectDB = async () => {
  await mongoose.connect(
    "mongodb://swayam:megatron_03@ac-qe3zptf-shard-00-00.sgohuyg.mongodb.net:27017,ac-qe3zptf-shard-00-01.sgohuyg.mongodb.net:27017,ac-qe3zptf-shard-00-02.sgohuyg.mongodb.net:27017/devstinder?ssl=true&authSource=admin&replicaSet=atlas-j3io9p-shard-0&retryWrites=true&w=majority"
  );
};

module.exports = connectDB;
