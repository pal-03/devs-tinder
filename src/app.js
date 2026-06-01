const express = require("express");

const connectDB = require("./config/database");
const User = require("./models/user");

const app = express();
const PORT = process.env.PORT || 7777;

// we use middleware inside app.use() method to parse incoming JSON payloads in the request body. This allows us to easily access the data sent by the client in the request body as a JavaScript object, which we can then use in our route handlers to perform operations such as saving to the database or sending responses back to the client.
// this is working now for all the incoming requests to the server, so we can access the JSON data sent by the client in the request body using req.body in our route handlers. This is essential for handling POST requests where clients send data to the server, such as when creating a new user or updating user information.
app.use(express.json());// 
// This line of code is a middleware function in an Express.js application that parses incoming JSON payloads in the request body. When a client sends a request with a JSON payload (e.g., when creating a new user or updating user information), this middleware will automatically parse the JSON data and make it available in the `req.body` object for further processing in the route handlers. This allows you to easily access the data sent by the client and use it to perform operations such as saving to the database or sending responses back to the client.

// JS object vs JSON:

// JavaScript Object (JS Object):
// A JavaScript object is a data structure that can hold various types of data, including properties and methods. It is defined using curly braces {} and can contain key-value pairs. For example:
// const user = {
//   firstName: "John",
//   lastName: "Doe",
//   age: 30,
//   greet: function() {
//     console.log("Hello!");
//   }
// };

// JSON (JavaScript Object Notation):
// JSON is a lightweight data interchange format that is easy for humans to read and write, and easy for machines to parse and generate. It is a text format that represents data as key-value pairs, similar to JavaScript objects, but it is not executable code. JSON is often used for transmitting data between a server and a web application as an alternative to XML. For example:
// {
//   "firstName": "John",
//   "lastName": "Doe",
//   "age": 30
// }

// In summary, a JavaScript object is a data structure used in JavaScript programming, while JSON is a text format used for data interchange. The `express.json()` middleware allows Express.js to parse incoming JSON payloads and make the data available as JavaScript objects in the request handlers.    


app.post("/signup", async (req, res) => {
  // Destructure the user data from the request body. This allows us to easily access the individual fields (firstName, lastName, emailId, password,
  // data is already parsed as JSON by the express.json() middleware, so we can directly access the properties of req.body to get the user data sent by the client in the request payload. This makes it convenient to work with the user data and perform operations such as saving it to the database or sending responses back to the client.
  const { firstName, lastName, emailId, password, age, gender } = req.body;

  // Create a new user instance using the User model and the data from the request body. The User model is defined in the src/models/user.js file, and it represents the structure of the user documents in the MongoDB collection. By creating a new instance of the User model with the provided data, we can then save this instance to the database, which will create a new user document in the users collection.
  const user = new User({
    firstName,
    lastName,
    emailId,
    password,
    age,
    gender,
  });

  try {
    await user.save(); // Save the user instance to the database. This will create a new document in the users collection with the data provided in the request body. If the save operation is successful, it will return a success response to the client. If there is an error during the save operation (e.g., validation error, database connection issue), it will catch the error and return an error response to the client.
    res.status(201).send("User added successfully!");
  } catch (err) {
    // If there is an error while saving the user to the database, this catch block will handle the error and send a response with a status code of 400 (Bad Request) along with an error message that includes the details of the error. This allows the client to understand what went wrong during the user creation process and take appropriate action (e.g., correcting the input data or trying again later).
    res.status(400).send("Error saving the user: " + err.message);
  }
});

// Get user by email
// This API endpoint allows clients to retrieve a user from the database based on their email address. When a GET request is made to the /user endpoint with an emailId in the request body, the server will attempt to find a user document in the MongoDB collection that matches the provided emailId. If a user is found, it will return the user data in the response. If no user is found with the given emailId, it will return a 404 status code with a "User not found" message. If there is an error during the database query, it will return a 400 status code with an error message.
app.get("/user", async (req, res) => {
  // Extract the emailId from the query parameters of the request. 
  // This allows clients to specify the emailId they want to search for when making a GET request to the /user endpoint. The emailId is expected to be passed as a query parameter in the URL (e.g., /
  const userEmail = req.query.emailId;

  if (!userEmail) {
    return res.status(400).send("emailId query param is required");
  }

  try {
    // what is the difference between findOne and find in mongoose?
    // The findOne method in Mongoose is used to retrieve a single document from the database that matches the specified query criteria. It returns the first document that matches the query. If no documents match the query, it returns null. For example:
    // const user = await User.findOne({ emailId: userEmail });

    // On the other hand, the find method is used to retrieve multiple documents from the database that match the specified query criteria. It returns an array of documents that match the query. If no documents match the query, it returns an empty array. For example:
    // const users = await User.find({ age: { $gt: 18 } }); 
    // In summary, findOne is used to retrieve a single document, while find is used to retrieve multiple documents from the database based on the specified query criteria.
    // how does the user data look like here after retrieving it from the database using findOne? eg:
    // {
    //   "_id": "60c72b2f9b1d8e5a5c8f9b1",
    //   "firstName": "John",
    //   "lastName": "Doe",
    //   "emailId": " 
    //   "password": "hashed_password",
    //   "age": 30, 
    //   "gender": "male",
    //   "__v": 0
    // }
    const user = await User.findOne({ emailId: userEmail }).select("-password");

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.send(user);
  } catch (err) {
    res.status(400).send("Something went wrong");
  }
});

// Feed API - GET /feed - get all the users from the database
// This API endpoint allows clients to retrieve all users from the database. When a GET request is made to the /feed endpoint, the server will query the MongoDB collection for all user documents and return them in the response. If there is an error during the database query, it will return a 400 status code with an error message. This endpoint can be used to display a feed of users in the application, allowing clients to see all the users that are registered in the database.
app.get("/feed", async (req, res) => {
  try {
    // The find method is used to retrieve all user documents from the database. It returns an array of user objects that match the query criteria. In this case, since we are not providing any specific query criteria, it will return all user documents in the collection. The retrieved user data will be sent back in the response to the client, allowing them to see a feed of all users registered in the database.
    // eg of the user data returned by the find method:
    // [
    //   {
    //     "_id": "60c72b2f9b1d8e5a5c8f9b1",
    //     "firstName": "John",
    //     "lastName": "Doe",
    //     "emailId": "   "password": "hashed_password",  
    //     "age": 30,
    //     "gender": "male",
    //     "__v": 0
    //   },
    //   {
    //     "_id": "60c72b2f9b1d8e5a5c8f9b2",
    //     "firstName": "Jane",
    //     "lastName": "Smith",
    //     "emailId": "   "password": "hashed_password",  
    //     "age": 25,
    //     "gender": "female",
    //     "__v": 0
    //   }
    // ]        
    const users = await User.find({}).select("-password");
    res.send(users);
  } catch (err) {
    res.status(400).send("Something went wrong");
  }
});

// Detele a user from the database
// This API endpoint allows clients to delete a user from the database based on their userId. When a DELETE request is made to the /user endpoint with a userId in the request body, the server will attempt to find and delete the user document in the MongoDB collection that matches the provided userId. If the user is successfully deleted, it will return a success message in the response. If there is an error during the deletion process (e.g., invalid userId, database connection issue), it will return a 400 status code with an error message.
app.delete("/user", async (req, res) => {
  const userId = req.body.userId;
  try {
    // The findByIdAndDelete method is used to find a user document by its unique identifier (userId) and delete it from the database. It takes the userId as an argument and attempts to find the corresponding user document in the collection. If a user with the specified userId is found, it will be deleted from the database, and the method will return the deleted user document. If no user is found with the given userId, it will return null. In this case, we are using the findByIdAndDelete method to delete a user based on their userId, which is provided in the request body.
    // SEND IT line userId or {_id: userId} both are working, but the first one is more concise and straightforward when using findByIdAndDelete, as it directly takes the userId as an argument without needing to wrap it in an object. The second approach, where you pass an object with _id: userId, is more commonly used with methods like findOneAndDelete or findOneAndUpdate, where you need to specify a query object to find the document based on certain criteria. In the case of findByIdAndDelete, since it is specifically designed to find a document by its unique identifier, passing the userId directly is more appropriate and cleaner.
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.send("User deleted successfully");
  } catch (err) {
    res.status(400).send("Something went wrong ");
  }
});

// Update data of the user
// This API endpoint allows clients to update a user's information in the database based on their userId. When a PATCH request is made to the /user endpoint with a userId and updated data in the request body, the server will attempt to find the user document in the MongoDB collection that matches the provided userId and update it with the new data. If the user is successfully updated, it will return a success message in the response. If there is an error during the update process (e.g., invalid userId, database connection issue), it will return a 400 status code with an error message. The findByIdAndUpdate method is used to find a user document by its unique identifier (userId) and update it with the new data provided in the request body. It takes the userId, the updated data, and an options object as arguments. The returnDocument: "after" option ensures that the updated user document is returned after the update operation is performed. This allows us to see the changes made to the user document in the response.
app.patch("/user/:userId", async (req, res) => {
   const userId = req.params?.userId; // Extract the userId from the URL parameters of 
   // the request. 
   // This allows clients to specify the userId of the user they want to update when
   //  making a PATCH request to the /user/:userId endpoint. 
   // The userId is expected to be passed as a URL parameter (e.g., /user/60c72b2f9b1d8e5a5c8f9b1), which will be extracted and used to identify the user document in the database that needs to be updated with the new data provided in the request body.
  const data = req.body;
  try {
    // The ALLOWED_UPDATES array defines the fields that are allowed to be updated 
    // in the user document. 
    // This is a security measure to prevent unauthorized updates to sensitive fields
    //  (e.g., emailId, password) that should not be changed by clients. 
    // y checking if the keys in the incoming data match the allowed fields, 
    // we can ensure that only valid and expected updates are made to the user document in the database.
    const ALLOWED_UPDATES = ["photoUrl", "about", "gender", "age", "skills"];
    const isUpdateAllowed = Object.keys(data).every((k) =>
      ALLOWED_UPDATES.includes(k)
    );
    if (!isUpdateAllowed) {
      throw new Error("Update not allowed");
    }
    // 
    if (data?.skills?.length > 10) {
      throw new Error("Skills cannot be more than 10");
    }
    // what does findByIdAndUpdate do in mongoose?
    // The findByIdAndUpdate method in Mongoose is used to find a document by its unique identifier (userId) and update it with new data. It takes three arguments: the userId of the document to be updated, an object containing the updated data,
    //  and an options object. The method will search for the document with the specified userId in the collection, and if found, it will update the document with the new data provided.
    //  The returnDocument: "after" option ensures that the updated document is returned after the update operation is performed, allowing you to see the changes made to the document in the response.
    //  If no document is found with the given userId, it will return null. In this case, we are using findByIdAndUpdate to update a user's information based on their userId, which is provided in the request body along with the new data to be updated.
    // if data has anything other than schema fields, then it will be ignored and not updated
    //  in the database, because Mongoose will only update the fields that are defined in the schema.
    //  Any additional fields that are not part of the schema will be ignored and will not affect the update operation. This ensures that only valid and expected data is stored in the database, maintaining data integrity and consistency.
    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: "after",
      runValidators: true,
      // why runValidators is true here?
      // The runValidators option is set to true in the findByIdAndUpdate method to ensure 
      // that the validation rules defined in the Mongoose schema are applied when updating
      //  a document. When this option is enabled, Mongoose will validate the updated data 
      // against the schema before applying the changes to the database. If any of the 
      // updated fields violate the validation rules (e.g., required fields are missing, data types are incorrect, custom validation functions fail),
      //  Mongoose will throw a validation error and prevent the update from being applied.
      //  This helps maintain data integrity and ensures that only valid data is stored in the
      //  database when updating user information.
    });
    if (!user) {
      return res.status(404).send("User not found");
    }

    console.log(user);
    res.send("User updated successfully");
  } catch (err) {
    // If there is an error while updating the user in the database, this catch block will handle the error and send a response with a status code of 400 (Bad Request) along with an error message that includes the details of the error. This allows the client to understand what went wrong during the user update process and take appropriate action (e.g., correcting the input data or trying again later).
    res.status(400).send("UPDATE FAILED:" + err.message);
    // res.status(400).send("Something went wrong ");
  }
});

// Start the server after establishing a connection to the database
const startServer = async () => {
  try {
    // Establish a connection to the database before starting the server
    await connectDB();
    console.log("Database connection established...");
    app.listen(PORT, () => {
      console.log(`Server is successfully listening on port ${PORT}...`);
    });
  } catch (err) {
    console.error("Database cannot be connected!!");
    console.error(err.message);
    process.exit(1);
  }
};

startServer();
