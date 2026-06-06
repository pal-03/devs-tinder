const mongoose = require("mongoose");  // Importing the Mongoose library,
//  which is an Object Data Modeling (ODM) library for MongoDB and Node.js.
//  It provides a schema-based solution to model application data and includes 
// built-in type casting, validation, query building, and business logic hooks.

const connectionRequestSchema = new mongoose.Schema( // Defining a new Mongoose schema 
// for the ConnectionRequest model.
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId, // The fromUserId field is defined as an
      //  ObjectId type, which is a special type in MongoDB used to store references
      //  to other documents. In this case, it will store the ID of the user who is 
      // sending the connection request.
      required: true,
      ref: "User", // refernce to the user collection
      // The ref option is used to specify the name of the model that this field references.
      //  In this case, it indicates that the fromUserId field references the User model,
      //  which means that it will store the ID of a user document from the User collection in the MongoDB database.
      //  This allows for establishing relationships between connection requests and users in the application.
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
        ref: "User", // refernce to the user collection
    },
    status: {
      type: String,
      required: true,
      enum: { // The enum option is used to specify a set of allowed values for 
      // the status field.
        values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is incorrect status type`,
      },
    },
  },
  { timestamps: true } // The timestamps option is set to true, which means that Mongoose will
  // automatically add createdAt and updatedAt fields to the schema. These fields will 
  // store the timestamps for when a connection request document is created and last updated, respectively.
);

// ConnectionRequest.find({fromUserId: 273478465864786587, toUserId: 273478465864786587})

// The code then creates a compound index on the fromUserId and toUserId fields of the connectionRequestSchema.
//  This index is created to optimize queries that involve both the fromUserId and toUserId fields, 
// such as when checking for existing connection requests between two users. By creating this index, 
// the database can quickly locate documents based on the combination of fromUserId and toUserId, 
// improving the performance of queries that involve these fields.

// compound index is created using the index method on the schema, where we specify the
//  fields to be indexed and their sort order (1 for ascending). 
// In this case, we are creating an index on the fromUserId and toUserId fields,
//  which will allow for efficient querying of connection requests based on these two fields.
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

// The code also defines a pre-save hook on the connectionRequestSchema using the pre method.
//  This hook is executed before a connection request document is saved to the database. 
// The function checks if the fromUserId is the same as the toUserId, which would indicate
// that a user is trying to send a connection request to themselves. If this is the case,
//  the function throws an error with the message "Cannot send connection request to yourself!". 
// This validation ensures that users cannot send connection requests to themselves, which would not make sense in the context of a social networking application.
connectionRequestSchema.pre("save", function () {
  const connectionRequest = this;
  // Check if the fromUserId is same as toUserId
  // cannot directly compare ObjectId values using the equality operator (== or ===)
  //  because they are objects. Instead, we need to use the equals method provided
  //  by Mongoose to compare the values of the ObjectId fields.
  //  The equals method checks if the values of the fromUserId and toUserId 
  // fields are equal, which indicates that a user is trying to send a connection 
  // request to themselves. If this condition is true, an error is thrown to prevent such a connection request from being saved to the database.
  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new Error("Cannot send connection request to yourself!");
  }
});


// The ConnectionRequestModel is created using the mongoose.model method, 
// which takes the name of the model ("ConnectionRequest") and the schema
//  (connectionRequestSchema) as arguments. This creates a Mongoose model 
// that can be used to interact with the connection requests collection in 
// the MongoDB database. The model provides methods for creating, querying,
//  updating, and deleting connection request documents in the database.
const ConnectionRequestModel = new mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema
);

module.exports = ConnectionRequestModel;
