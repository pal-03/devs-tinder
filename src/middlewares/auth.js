const adminAuth = (req, res, next) => {
  console.log("Admin auth is getting checked!!");
  const token = "xyz";
  // In a real application, you would typically extract the token from the request headers (e.g., Authorization header) and verify it against a database or an authentication service. For simplicity, we are using a hardcoded token here.
  const isAdminAuthorized = token === "xyz";
  if (!isAdminAuthorized) {
    // If the token does not match the expected value, we send a 401 Unauthorized response to the client, indicating that the request is not authorized to access the requested resource. This is a common practice in authentication middleware to prevent unauthorized access to protected routes.
    // this will break the request-response cycle and the subsequent route handlers for "/admin/getAllData" and "/admin/deleteUser" will not be executed if the authentication fails, as the response is sent immediately when the request is unauthorized.
    // res object has status() method to set the HTTP status code of the response and send() method to send the response body. In this case, we are setting the status code to 401 (Unauthorized) and sending a message "Unauthorized request" as the response body.
    res.status(401).send("Unauthorized request");
  } else {
    // call next() to pass control to the next middleware function or route handler in the stack if the request is authorized. This allows the request to proceed to the intended route handler after successful authentication.
    next();
  }
};

// Similar to the adminAuth middleware, the userAuth middleware checks for a specific token to determine if the user is authorized. If the token does not match the expected value, it sends a 401 Unauthorized response. If the token is valid, it calls next() to allow the request to proceed to the next middleware function or route handler.
const userAuth = (req, res, next) => {
  console.log("User auth is getting checked!!");
  const token = "xyzabc";
  const isAdminAuthorized = token === "xyz";
  if (!isAdminAuthorized) {
    res.status(401).send("Unauthorized request");
  } else {
    next();
  }
};

module.exports = {
  adminAuth,
  userAuth,
};