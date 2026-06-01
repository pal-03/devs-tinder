const mongoose = require("mongoose");
const validator = require("validator"); 
// The validator library is used for validating and sanitizing strings.
//  In this code, it is used to validate the emailId field to ensure that it contains a 
// valid email address and to validate the password field to ensure that it meets
//  certain strength requirements.
//  Additionally, it is used to validate the photoUrl field to ensure that 
// it contains a valid URL. 
// By using the validator library, we can ensure that the data being stored 
// in the database is in the correct format and meets the specified validation criteria.

// create a schema for the user model using mongoose.Schema
// Schema method is used to define the structure of the documents in a MongoDB collection. It allows you to specify the fields, their data types, and any validation rules for the documents that will be stored in the collection. In this code, we are defining a userSchema that includes fields such as firstName, lastName, emailId, password, age, and
// Schema by mongoose is a way to define the structure of the documents in a MongoDB collection. It allows you to specify the fields, their data types, and any validation rules for the documents that will be stored in the collection. In this code, we are defining a userSchema that includes fields such as firstName, lastName, emailId, password, age, and
// break the comment here because it is too long and brrak it into two lines
// gender. Each field is defined with a specific data type (String for text fields and Number for age). This schema will be used to create a Mongoose model, which will allow us to interact with the MongoDB collection for users, enabling us to perform operations like creating, reading, updating, and deleting user documents in the database.
// User is the tab/collection name in the database which will be created by mongoose when we create a model using this schema. The model will be used to interact with the MongoDB collection for users, enabling us to perform operations like creating, reading, updating, and deleting user documents in the database.
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true, // This means that the firstName field is mandatory and must be provided when creating a new user document in the database. If a user tries to create a document without providing a firstName, Mongoose will throw a validation error.
      minLength: 4,
      maxLength: 50,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      lowercase: true, // This means that the value of the emailId field will be automatically converted to lowercase before being saved to the database. This is useful for ensuring consistency in email addresses, as it allows users to enter their email in any case (e.g., "
      // Example: If a user enters "sws JDKD" as their email, it will be stored in the database as "sws jdjd". This helps to avoid issues with case sensitivity when users try to log in or search for their email address in the database.
      required: true,
      unique: true, // This means that the emailId field must be unique across all user documents in the database. If a user tries to create a document with an emailId that already exists, Mongoose will throw a validation error.
      trim: true,
      validate(value) {
        // validate function is a custom validation function that checks 
        // if the value of the emailId field is a valid email address using the
        //  validator library. If the value is not a valid email address, 
        // it throws an error with the message "Invalid email address: "
        //  followed by the invalid value.
        //  This ensures that only valid email addresses are stored in the database for the user documents.
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address: " + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error("Enter a Strong Password: " + value);
        }
      },
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      // The validate function is a custom validation function that checks if the value of the gender field is one of the allowed values
      // In this case, the allowed values are "male", "female", and "others".
      // If the value of the gender field is not one of these allowed values,
      //  the function will throw an error with the message "Gender data is not valid". This ensures that only valid gender values are stored in the database for the user documents.    
      // it takes the value of the gender field as an argument and checks if it is included in the array of allowed values
      validate(value) {
        if (!["male", "female", "others"].includes(value)) {
          throw new Error("Gender data is not valid");
        }
      },
    },
    photoUrl: {
      type: String,
      default: "https://geographyandyou.com/images/user-profile.png",
       validate(value) {
        if (!validator.isURL(value)) {
          throw new Error("Invalid Photo URL: " + value);
        }
      },
    },
    about: {
      type: String,
      default: "This is a default about of the user!", // This is a default about of the user!
    },
    skills: {
      type: [String],
    },
  },
  // The second argument to the mongoose.Schema constructor is an options object
  //  that allows you to specify additional settings for the schema.
  //  In this case, we are setting the timestamps option to true,
  //  which means that Mongoose will automatically add createdAt and updatedAt fields to
  //  the user documents in the database.
  //  These fields will store the timestamps for when a document is created and last updated,
  //  respectively.
  //  This can be useful for tracking when user documents were created and modified in 
  // the database.
  {
    timestamps: true,
  }
);

// .model() method is used to create a Mongoose model based on the defined schema. The first argument is the name of the model (in this case, "User"), and the second argument is the schema that defines the structure of the documents in the collection. The model will be used to interact with the MongoDB collection for users, enabling us to perform operations like creating, reading, updating, and deleting user documents in the database.
module.exports = mongoose.model("User", userSchema);
//You gave Mongoose the model name "User". Mongoose then converts that model name into a MongoDB collection name by:

// lowercasing it
// pluralizing it
// So:

// model name: User
// collection name: users
// That’s why Atlas shows the document in users.