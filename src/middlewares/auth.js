// const adminAuth = (req, res, next) => {
//   console.log("Admin auth is getting checked!!");
//   const token = "xyz";
//   // In a real application, you would typically extract the token from the request headers (e.g., Authorization header) and verify it against a database or an authentication service. For simplicity, we are using a hardcoded token here.
//   const isAdminAuthorized = token === "xyz";
//   if (!isAdminAuthorized) {
//     // If the token does not match the expected value, we send a 401 Unauthorized response to the client, indicating that the request is not authorized to access the requested resource. This is a common practice in authentication middleware to prevent unauthorized access to protected routes.
//     // this will break the request-response cycle and the subsequent route handlers for "/admin/getAllData" and "/admin/deleteUser" will not be executed if the authentication fails, as the response is sent immediately when the request is unauthorized.
//     // res object has status() method to set the HTTP status code of the response and send() method to send the response body. In this case, we are setting the status code to 401 (Unauthorized) and sending a message "Unauthorized request" as the response body.
//     res.status(401).send("Unauthorized request");
//   } else {
//     // call next() to pass control to the next middleware function or route handler in the stack if the request is authorized. This allows the request to proceed to the intended route handler after successful authentication.
//     next();
//   }
// };

const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { jwtSecret } = require("../config/env");

// Similar to the adminAuth middleware, the userAuth middleware checks for a specific token to determine if the user is authorized. If the token does not match the expected value, it sends a 401 Unauthorized response. If the token is valid, it calls next() to allow the request to proceed to the next middleware function or route handler.
// In a real application, you would typically extract the token from the request headers
//  (e.g., Authorization header) and verify it against a database or an
//  authentication service. For simplicity, we are using a hardcoded token here.
const userAuth = async (req, res, next) => {
  try {
    // extarct token from the cookies of the incoming request using req.cookies to retrieve the token that was set during the login process. We can then use this token to verify the user's identity and retrieve their profile information securely.
    // we have used cookie parser middleware in our app.js file to parse the cookies attached to the client request object.
    //  When a client sends a request with cookies (e.g., for authentication or session management), this middleware will automatically parse the cookies and make them available in the req.cookies object for further processing in the route handlers. This allows you to easily access the cookies sent by the client and use them to perform operations such as verifying authentication tokens or managing user sessions in your application. In this code, we are accessing the cookies from the incoming request using req.cookies to retrieve the token that was set during the login process. We can then use this token to verify the user's identity and retrieve their profile information securely.
    const { token } = req.cookies;
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).send("ERROR: Authentication required");
    }

    // extracted the logic of verifying the token and fetching the user from the database
    //  into the userAuth middleware. 
    // This way, we can ensure that only authenticated users can access the protected routes,
    //  and we can also attach the user information to the request object for further
    //  use in the route handlers.
    // The jwt.verify function is used to verify the authenticity of a JWT token.
    //  It takes the token and the secret key used to sign the token as arguments. 
    // If the token is valid, it returns the decoded payload (in this case, an object 
    // containing the user's unique identifier _id). 
    // If the token is invalid or has expired, it throws an error.
    //  By using jwt.verify, we can ensure that only requests with valid tokens can access
    //  protected routes and retrieve user information securely based on their authenticated 
    // identity.
    const decodedObj = jwt.verify(token, jwtSecret);

    const { _id } = decodedObj;

    const user = await User.findById(_id).select("-password");
    // If no user is found with the given _id, 
    // we throw an error with the message "User not found". 
    // This ensures that only valid users can access the protected routes, 
    // and if an invalid token is provided or if the user does not exist in the database, 
    // an appropriate error message will be returned to the client.
    if (!user) {
      throw new Error("User not found");
    }

    // IMPORTANT
    req.user = user; // Attach the user information to the request object for further
    //  use in the route handlers.
    //  This allows us to access the authenticated user's information in any route handler
    //  that uses this middleware, enabling us to perform operations based on the user's
    //  identity and permissions.
    next();
  } catch (err) {
    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError" ||
      err.name === "NotBeforeError"
    ) {
      return res.status(401).send("ERROR: Invalid or expired token");
    }

    if (err.message === "User not found") {
      return res.status(401).send("ERROR: Authentication required");
    }

    res.status(500).send("ERROR: Authentication failed");
  }
  // console.log("User auth is getting checked!!");
  // const token = "xyzabc";
  // const isAdminAuthorized = token === "xyz";
  // if (!isAdminAuthorized) {
  //   res.status(401).send("Unauthorized request");
  // } else {
  //   next();
  // }
};

module.exports = {
  // adminAuth,
  userAuth,
};
