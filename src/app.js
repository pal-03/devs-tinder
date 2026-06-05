const express = require("express");

const connectDB = require("./config/database");
const User = require("./models/user");

// const { validateSignUpData } = require("./utils/validation");
// const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
// const { userAuth } = require("./middlewares/auth"); // This line of code imports the userAuth middleware function from the src/middlewares/auth.js file. The userAuth middleware is used to protect certain routes in the application by verifying the user's authentication status. When a route is protected with the userAuth middleware, it checks for a valid token in the request cookies, verifies the token, and retrieves the user's information from the database. If the token is valid and the user exists, it allows the request to proceed to the next middleware or route handler. If the token is invalid or if there is an error during verification, it sends an appropriate error response to the client. By using this middleware, we can ensure that only authenticated users can access certain routes and perform actions that require authentication in our application.

const app = express();
const PORT = process.env.PORT || 7777;

// we use middleware inside app.use() method to parse incoming JSON payloads in the request body. This allows us to easily access the data sent by the client in the request body as a JavaScript object, which we can then use in our route handlers to perform operations such as saving to the database or sending responses back to the client.
// this is working now for all the incoming requests to the server, so we can access the JSON data sent by the client in the request body using req.body in our route handlers. This is essential for handling POST requests where clients send data to the server, such as when creating a new user or updating user information.
app.use(express.json());// 
// This line of code is a middleware function in an Express.js application that parses incoming JSON payloads in the request body. When a client sends a request with a JSON payload (e.g., when creating a new user or updating user information), this middleware will automatically parse the JSON data and make it available in the `req.body` object for further processing in the route handlers. This allows you to easily access the data sent by the client and use it to perform operations such as saving to the database or sending responses back to the client.
app.use(cookieParser()); // This line of code is a middleware function in an Express.js application that parses cookies attached to the client request object. When a client sends a request with cookies (e.g., for authentication or session management), this middleware will automatically parse the cookies and make them available in the `req.cookies` object for further processing in the route handlers. This allows you to easily access the cookies sent by the client and use them to perform operations such as verifying authentication tokens or managing user sessions in your application.

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


// app.post("/signup", async (req, res) => {
//   // Destructure the user data from the request body. This allows us to easily access the individual fields (firstName, lastName, emailId, password,
//   // data is already parsed as JSON by the express.json() middleware, so we can directly access the properties of req.body to get the user data sent by the client in the request payload. This makes it convenient to work with the user data and perform operations such as saving it to the database or sending responses back to the client.
//   // const { firstName, lastName, emailId, password, age, gender } = req.body;

  
  

//   try {
//     // Validation of data
//     validateSignUpData(req);// This line of code calls the validateSignUpData function, which is a custom validation function defined in the src/utils/validation.js file. This function checks the validity of the user input data during the sign-up process. It takes the request object (req) as an argument and extracts the firstName, lastName, emailId, and password fields from the request body. It then performs a series of checks to validate the data, such as ensuring that the name fields are present, validating the email format, and checking the strength of the password. If any of the validation checks fail, it throws an error with an appropriate message, which is caught in the catch block and sent back to the client as a response with a status code of 400 (Bad Request). This ensures that only valid data is processed further in the sign-up process and helps maintain data integrity in the application.
//     // If the validation passes without throwing an error, the code will continue to execute and proceed with the user creation process, such as encrypting the password and saving the user data to the database.

//     const { firstName, lastName, emailId, password, age, gender, photoUrl, about, skills } = req.body;

//     // Encrypt the password
//     // This line of code uses the bcrypt library to hash the user's password before storing it in the database. The bcrypt.hash function takes the plain text password and a salt rounds value (in this case, 10) as arguments. The salt rounds value determines the computational cost of hashing the password, with higher values being more secure but also more time-consuming to compute. By hashing the password, we can ensure that even if the database is compromised, the actual passwords of the users will not be exposed, as they will be stored in a hashed format that is difficult to reverse-engineer. This is an important security measure to protect user data and prevent unauthorized access to user accounts in the event of a data breach. The hashed password will be stored in the database instead of the plain text password, enhancing the security of user information.
//     const passwordHash = await bcrypt.hash(password, 10);
//     // Create a new user instance using the User model and the data from the request body. The User model is defined in the src/models/user.js file, and it represents the structure of the user documents in the MongoDB collection. By creating a new instance of the User model with the provided data, we can then save this instance to the database, which will create a new user document in the users collection.
//      const user = new User({
//       firstName,
//       lastName,
//       emailId,
//       password: passwordHash,
//       age,
//       gender,
//       photoUrl,
//       about,
//       skills,
//     });
//     await user.save(); // Save the user instance to the database. This will create a new document in the users collection with the data provided in the request body. If the save operation is successful, it will return a success response to the client. If there is an error during the save operation (e.g., validation error, database connection issue), it will catch the error and return an error response to the client.
//     res.status(201).send("User added successfully!");
//   } catch (err) {
//     // If there is an error while saving the user to the database, this catch block will handle the error and send a response with a status code of 400 (Bad Request) along with an error message that includes the details of the error. This allows the client to understand what went wrong during the user creation process and take appropriate action (e.g., correcting the input data or trying again later).
//     res.status(400).send("ERROR : " + err.message);
//   }
// });
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");

// Login API - POST /login - login a user using email and password
// This API endpoint allows clients to log in a user by providing their email and password. When a POST request is made to the /login endpoint with the emailId and password in the request body, the server will attempt to find a user document in the MongoDB collection that matches the provided emailId. If a user is found, it will then compare the provided password with the hashed password stored in the database using bcrypt.compare. If the password is valid, it will return a success message in the response. If the user is not found or if the password is invalid, it will throw an error with an "Invalid credentials" message, which will be caught and returned as a response with a status code of 400 (Bad Request). This allows clients to authenticate users and access protected resources in the application based on their login status.
// app.post("/login", async (req, res) => {
//   try {
//     const { emailId, password } = req.body;

//     if (!emailId || !password) {
//       return res.status(400).send("ERROR : Email and password are required");
//     }

//     // 
//     const user = await User.findOne({ emailId: emailId });
//     if (!user) {
//       throw new Error("Invalid credentials");
//     }
//     // The bcrypt.compare function is used to compare the plain text password provided by the user during login with the hashed password stored in the database. It takes the plain text password and the hashed password as arguments and returns a boolean value indicating whether the passwords match. If the passwords match, it means that the user has entered the correct password, and we can proceed with logging them in. If the passwords do not match, it means that the user has entered an incorrect password, and we can throw an error with an "Invalid credentials" message to indicate that the login attempt was unsuccessful. This is an important step in the authentication process to ensure that only users with valid credentials can access their accounts and protected resources in the application.
//     // const isPasswordValid = await bcrypt.compare(password, user.password);
//     // user schema method to validate the password
//     // The validatePassword method is an instance method defined
//     //  on the userSchema that compares a password input by the user
//     //  with the hashed password stored in the database.
//     //  It uses the bcrypt library to compare the plaintext password input
//     //  by the user with the hashed password stored in the user document.
//     //  The method returns a boolean value indicating whether
//     //  the provided password is valid or not. This allows us to securely validate user credentials during login or authentication processes in the application. By calling user.validatePassword(password),
//     //  we can check if the password entered by the user matches the hashed password stored
//     //  in their user document, ensuring that only users with valid credentials can log in to their accounts.
//     const isPasswordValid = await user.validatePassword(password);

//     if (isPasswordValid) {

//       // Create a JWT Token
//       // The getJWT method is a custom instance method defined in the User model (src/models/user.js)
//       //  that generates a JSON Web Token (JWT) for the authenticated user. 
//       // This method typically takes the user's unique identifier (_id)
//       //  as the payload and signs it with a secret key to create a token that can be
//       //  used for authentication purposes.
//       //  By calling user.getJWT(), we can generate a JWT token for the authenticated user, 
//       // which can then be sent back to the client and stored in cookies or local storage
//       //  for subsequent requests to access protected resources in the application. 
//       // This allows us to maintain the user's authenticated state and provide secure 
//       // access to their account and other protected features in the application.
//       const token = await user.getJWT();

//       // JWT (JSON Web Token) is a compact, URL-safe means of representing claims to be transferred between two parties. In this code, we are using the jsonwebtoken library to create a JWT token for the authenticated user. The jwt.sign function takes a payload (in this case, an object containing the user's unique identifier _id) and a secret key ("DEV@Tinder$790") as arguments. The resulting token can be used for authentication purposes, allowing the client to include it in subsequent requests to access protected resources in the application. By creating a JWT token upon successful login, we can maintain the user's authenticated state and provide secure access to their account and other protected features in the application.
//      // const token = await jwt.sign({ _id: user._id }, "DEV@Tinder$790");
//      // we can even expire the token after a certain time period by adding an expiresIn option
//      //  to the jwt.sign function, like this:
//       // const token = await jwt.sign({ _id: user._id }, "DEV@Tinder$790", { expiresIn: "8h" });  
//        // Add the token to cookie and send the response back to the user
//        // .cookie is a method provided by the Express.js response object that allows you to set a cookie in the client's browser. In this case, we are setting a cookie named "token" with the value of the token variable (which would typically be a JWT or some form of authentication token). By setting this cookie, we can maintain the user's authenticated state across different requests, allowing them to access protected resources without needing to log in again for each request. The cookie will be sent back to the client in the response headers, and the client's browser will store it and include it in subsequent requests to the server, enabling session management and user authentication in the application.

//        // what does the jwt made of?
//         // A JWT (JSON Web Token) is made up of three parts: the header, the payload, and the signature. These parts are separated by dots (.) in the token string. The header typically contains information about the type of token and the signing algorithm used. The payload contains the claims or data that you want to include in the token, such as user information or permissions. The signature is created by taking the encoded header and payload, combining them with a secret key, and applying a cryptographic algorithm to generate a unique signature. This signature is used to verify the integrity of the token and ensure that it has not been tampered with. When a client receives a JWT, it can decode the token to access the header and payload, and verify the signature to ensure that the token is valid and trustworthy.
//         // eg like here we use id as the payload and "DEV@Tinder$790" as the secret key to create the signature.
//         //  The resulting token will contain the encoded header, payload, and signature,
//         //  which can be used for authentication and authorization purposes in the application.
//       // res.cookie("token", token);
//        res.cookie("token", token, {
//         expires: new Date(Date.now() + 8 * 3600000), // Set the cookie to expire in 8 hours (8 hours * 3600000 milliseconds/hour)
//         httpOnly: true,
//         sameSite: "lax",
//       });
//       res.send("Login Successful!!!");
//     } else {
//       throw new Error("Invalid credentials");
//     }
//   } catch (err) {
//     res.status(400).send("ERROR : " + err.message);
//   }
// });

// Profile API - GET /profile - get the profile of the logged-in user
// This API endpoint allows clients to retrieve the profile information of the currently logged-in user.
//  When a GET request is made to the /profile endpoint,
//  the server will first check for the presence of a token in the cookies of the incoming
//  request. If a token is found, it will verify the token using the jsonwebtoken 
// library and extract the user's unique identifier (_id) from the decoded token.
//  Then, it will query the MongoDB collection to find the user document that 
// matches the extracted _id. If a user is found, it will return the user's
//  profile information in the response. If there is an error during this process
//  (e.g., invalid token, user not found), it will return a 400 status code with an
//  appropriate error message. This allows authenticated users to access their profile
//  information securely by verifying their identity through the token stored in their cookies.
// userAuth middleware is used to protect this route, 
// ensuring that only authenticated users can access their profile information.


//  The middleware will verify the token and attach the user information
//  to the request object, allowing us to easily access the user's profile data
//  in the route handler and send it back in the response. This provides a secure way
//  for users to access their profile information while ensuring that unauthorized access 
// is prevented.
// app.get("/profile",userAuth, async (req, res) => {
//   try {
//     // cookie parser middleware is used to parse the cookies attached to the client request object. When a client sends a request with cookies (e.g., for authentication or session management), this middleware will automatically parse the cookies and make them available in the `req.cookies` object for further processing in the route handlers. This allows you to easily access the cookies sent by the client and use them to perform operations such as verifying authentication tokens or managing user sessions in your application. In this code, we are accessing the cookies from the incoming request using `req.cookies` to retrieve the token that was set during the login process. We can then use this token to verify the user's identity and retrieve their profile information securely.
//     // const cookies = req.cookies;

//     // const { token } = cookies;
//     // if (!token) {
//     //   throw new Error("Invalid Token");
//     // }

//     // The jwt.verify function is used to verify the authenticity of a JWT token. 
//     // It takes the token and the secret key used to sign the token as arguments.
//     //  If the token is valid and has not been tampered with,
//     //  it will return the decoded payload (in this case, the user's unique identifier _id). 
//     // If the token is invalid or has expired, it will throw an error.
//     //  In this code, we are using jwt.verify to ensure that the token provided in the cookies
//     //  is valid before allowing access to the user's profile information. 
//     // This helps to secure the endpoint and ensure that only authenticated 
//     // users can access their profile data.
//     // const decodedMessage = await jwt.verify(token, "DEV@Tinder$790");

//     // const { _id } = decodedMessage; // decdode the info using the secret key and extract the user's unique identifier (_id) from the decoded token.
//     //  This _id can then be used to query the database and retrieve the corresponding user
//     //  document, allowing us to access the user's profile information 
//     // securely based on their authenticated identity.

//     // The findById method is used to retrieve a user document from the 
//     // database based on the unique identifier (_id) extracted from the decoded token.
//     //  It takes the _id as an argument and queries the MongoDB collection for a document 
//     // that matches that _id. If a user document is found, it will be returned; otherwise,
//     //  it will return null. This allows us to securely access the user's profile
//     //  information by using their unique identifier obtained from the verified token,
//     //  ensuring that only authenticated users can access their own profile data in the
//     //  application.
//     // const user = await User.findById(_id);
//     // if (!user) {
//     //   throw new Error("User does not exist");
//     // }
//     // extarct user from the request object, which was attached by the userAuth middleware
//     //  after verifying the token and fetching the user from the database.
//     //  This allows us to access the authenticated user's information in this route handler
//     //  without needing to repeat the token verification and user retrieval logic,
//     //  as it has already been handled by the middleware. We can then send the user's profile
//     //  information back in the response to the client.
//      const user = req.user;
//     res.send(user);
//   } catch (err) {
//     res.status(400).send("ERROR : " + err.message);
//   }
// });

// Connection Request API - POST /sendConnectionRequest -
//  send a connection request to another user
// This API endpoint allows authenticated users to send a connection request to another user.
//  When a POST request is made to the /sendConnectionRequest endpoint,
//  the server will first check for the presence of a valid token in the cookies
//  of the incoming request using the userAuth middleware. 
// If the token is valid and the user is authenticated, it will extract the user's information from the request object (which was attached by the userAuth middleware) and proceed to handle the logic for sending a connection request. The specific implementation of sending a connection request (e.g., updating the database, notifying the recipient) would need to be added in this route handler. Finally, it will send a response back to the client indicating that the connection request has been sent successfully. This allows users to connect with each other in the application while ensuring that only authenticated users can perform this action.
// app.post("/sendConnectionRequest", userAuth, async (req, res) => {
//   const user = req.user;
//   // Sending a connection request
//   console.log("Sending a connection request");

//   res.send(user.firstName + " sent the connect request!");
// });
app.use("/", authRouter); // This line of code mounts the authRouter on the root path ("/")
//  of the Express application.
//  This means that any routes defined in the authRouter
//  will be accessible from the root URL of the application.
//  For example, if there is a route defined in authRouter for "/login",
//  it will be accessible at "/login" in the main application.
//  By using app.use("/", authRouter), 
// we are effectively integrating the authentication routes defined in authRouter into 
// our main Express application, allowing us to handle authentication-related requests
//  such as user registration and login through the routes defined in authRouter.
app.use("/", profileRouter); // This line of code mounts the profileRouter on the root path ("/") of the Express application. This means that any routes defined in the profileRouter will be accessible from the root URL of the application. For example, if there is a route defined in profileRouter for "/profile", it will be accessible at "/profile" in the main application. By using app.use("/", profileRouter), we are effectively integrating the profile-related routes defined in profileRouter into our main Express application, allowing us to handle requests related to user profiles through the routes defined in profileRouter.
app.use("/", requestRouter); // it tells app that when a request comes in that matches the
//  routes defined in requestRouter,
//  it should use the requestRouter to handle those requests.
//  This allows us to organize our routes into separate modules (like requestRouter) 
// and keep our main application file clean and modular. 
// By using app.use("/", requestRouter), we are effectively integrating the connection
//  request-related routes defined in requestRouter into our main Express application,
//  allowing us to handle requests related to sending connection requests through the 
// routes defined in requestRouter.

// Get user by email
// This API endpoint allows clients to retrieve a user from the database based on their email address. When a GET request is made to the /user endpoint with an emailId in the request body, the server will attempt to find a user document in the MongoDB collection that matches the provided emailId. If a user is found, it will return the user data in the response. If no user is found with the given emailId, it will return a 404 status code with a "User not found" message. If there is an error during the database query, it will return a 400 status code with an error message.
app.get("/user", async (req, res) => {
  // Extract the emailId from the query parameters of the request. 
  // This allows clients to specify the emailId they want to search for when making a GET request to the /user endpoint. The emailId is expected to be passed as a query parameter in the URL (e.g., /user?emailId=john.doe@example.com). By extracting the emailId from the query parameters, we can use it to query the database and retrieve the corresponding user document that matches the provided emailId. This enables clients to easily search for users based on their email addresses and retrieve their information from the database.   
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
