// starting point of the application
// we need to create a server to listen to requests
// we create a server using express framework
// what is express? it is a web framework for node.js that makes it easy to create web applications and APIs
// more about express lets discuss
// express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It allows you to create web servers and APIs quickly and easily. With express, you can handle routing, middleware, and various HTTP methods with ease. It also supports template engines, making it easier to render dynamic content on the server side. Overall, express is a popular choice for building web applications and APIs in the Node.js ecosystem.
// features of express
// 1. Server-side development: Express allows you to create server-side applications and APIs using Node.js. You can handle HTTP requests, manage routes, and serve static files with ease.
// 2. Routing: Express provides a powerful routing system that allows you to define routes for different HTTP methods (GET, POST, PUT, DELETE, etc.) and URL patterns. This makes it easy to organize your application and handle different endpoints.
// Middleware: Express supports middleware functions that can be used to modify the request and response objects, handle authentication, log requests, and perform various other tasks. Middleware functions can be added globally or to specific routes.

// 3. HTTP utilities: Express provides a set of HTTP utility methods that make it easier to work with HTTP requests and responses. This includes methods for handling cookies, managing sessions, and parsing request bodies.

// 4. Template engines: Express supports various template engines (like EJS, Pug, Handlebars) that allow you to render dynamic content on the server side. This is useful for creating dynamic web pages and views.

// Building APIs: Express is commonly used for building RESTful APIs. It provides a simple and efficient way to handle API routes, manage request data, and send responses in various formats (JSON, XML, etc.).

// Scalability: Express is designed to be lightweight and flexible, making it suitable for both small and large applications. You can start with a simple application and scale it up as needed by adding more routes, middleware, and features.
// Open-source: Express is an open-source framework, which means it has a large and active community of developers who contribute to its development and provide support. This makes it easier to find resources, tutorials, and solutions to common problems when working with Express.

// what does ~ before a version number in package.json mean?
// In package.json, the tilde (~) before a version number indicates that the package manager should install the latest patch version of the specified minor version. For example, if you have "~1.2.3" in your package.json, it will allow updates to any version that is greater than or equal to 1.2.3 but less than 1.3.0. This means that it will install versions like 1.2.4, 1.2.5, etc., but not 1.3.0 or higher. The tilde is used to ensure that you get bug fixes and improvements without introducing breaking changes that may come with a new minor version.

const express = require("express"); // we need to import the express module to use it in our application
const { adminAuth, userAuth } = require("./middlewares/auth");

const app = express(); // we create an instance of express and assign it to the variable app. This instance will be used to define routes and middleware for our application.
// why do we need to create an instance of express? because it allows us to use the features and functionalities provided by the express framework. By creating an instance, we can define routes, handle requests, and manage middleware for our application. It serves as the main entry point for our application and allows us to build web servers and APIs using express.

// this route overrides the default route of the server. Whenever a request is made to the root URL ("/"), this route will be executed and the response "Namaste Swayams!" will be sent back to the client. This is a simple way to define a route and send a response using express. You can define multiple routes for different URLs and HTTP methods to handle various requests in your application.

// /test or /test/ or /test/hello all will be handled by this route because we are using app.use() which is a middleware function that will be executed for every incoming request to the specified route. In this case, we are defining a middleware function that will be executed for any request to the root URL ("/"). This means that any request that starts with "/" will be handled by this route, including requests to "/test" and "/test/hello". The response "Namaste Swayams!" will be sent back to the client for all these requests.

// the order in which we define routes in express is important because express processes routes in the order they are defined. When a request is made to the server, express will check each route in the order they were defined to see if it matches the incoming request. If a match is found, the corresponding route handler will be executed and the response will be sent back to the client. If no match is found, express will continue to check the next route until it finds a match or reaches the end of the route definitions. Therefore, if you define a more specific route after a more general route, the specific route may never be reached because the general route will handle all requests that match its pattern. This is why it's important to define routes in a logical order, starting with more specific routes and then defining more general routes afterwards.

// app.use("/", (req, res) => {
//     // we define a route for the root URL ("/") using the app.use() method. This method is used to define middleware functions that will be executed for every incoming request to the specified route. In this case, we are defining a middleware function that will be executed for any request to the root URL. The function takes two parameters: req (the request object) and res (the response object). Inside the function, we use the res.send() method to send a response back to the client. In this case, we are sending the string "Namaste Swayam!" as the response.
//   res.send("Namaste Swayamss!");
// });

// app.use("/hello", (req, res) => {
//   res.send("Hello hello hello!");
// });

// this will match all the HTTP method API calls to /test
// app.use("/test", (req, res) => {
//   res.send("Hello from the server!");
// });

// This will only handle GET call to /user
// do not use app.use() for handling specific routes and HTTP methods. Instead, use app.get(), app.post(), app.put(), app.delete(), etc. to define routes for specific HTTP methods. This allows you to handle different types of requests (GET, POST, PUT, DELETE, etc.) separately and ensures that your application behaves as expected for each type of request. Using app.use() for specific routes can lead to unexpected behavior and may not properly handle the intended HTTP methods.
// app.get("/user", (req, res) => {
//   res.send({ firstName: "Swayam", lastName: "Pal" });
// });

// what will happen if we use a an app.use in the top with /user and then we define app.get("/user") ? The app.use() method will be executed for every incoming request to the specified route, which in this case is "/user". This means that any request to "/user" will first trigger the middleware function defined in app.use(), and then it will proceed to check for any specific routes defined for "/user". If there is a specific route defined for "/user" (like app.get("/user")), it will be executed after the middleware function. However, if there is no specific route defined for "/user", the middleware function will handle the request and send a response back to the client. Therefore, using app.use() with a specific route can lead to unexpected behavior if you also have specific routes defined for that same route, as the middleware function may interfere with the intended functionality of the specific routes. It's generally recommended to use app.use() for defining global middleware that applies to all routes, and use specific route handlers (like app.get(), app.post(), etc.) for handling specific routes and HTTP methods.

// Adv concepts
// if we add /ab?c in the route, then it will match both /abc and /ac because the ? makes the preceding character (in this case, 'b') optional. This means that the route will match both URLs, allowing for flexibility in the URL structure while still directing requests to the same route handler.
// if we add /ab+c in the route, then it will match both /abc and /abbc because the + indicates that the preceding character (in this case, 'b') must appear one or more times. This means that the route will match URLs that contain at least one 'b' between 'a' and 'c', allowing for variations in the URL structure while still directing requests to the same route handler.


// This will handle POST call to /user
// In this route, we are using the app.post() method to define a route that will handle POST requests to the "/user" URL. The function takes two parameters: req (the request object) and res (the response object). Inside the function, we log the request body (req.body) to the console, which contains the data sent by the client in the POST request. After processing the data (e.g., saving it to a database), we send a response back to the client indicating that the data was successfully saved to the database.

// This will handle GET call to /user/:userId/:name/:password
// In this route, we are using the app.get() method to define a route that will handle GET requests to the "/user/:userId/:name/:password" URL. The colon (:) before each parameter (userId, name, password) indicates that these are dynamic parameters that can be accessed through the req.params object. When a request is made to this route, the values for userId, name, and password will be extracted from the URL and can be used within the route handler function. In this example, we log the req.params object to the console, which will contain the values of userId, name, and password. Finally, we send a response back to the client with some user information (firstName and lastName) as a JSON object.
// app.get("/user/:userId/:name/:password", (req, res) => {
//   console.log(req.params);
//   res.send({ firstName: "Akshay", lastName: "Saini" });
// });
// give an example of query parameters in express
// In this route, we are using the app.get() method to define a route that will handle GET requests to the "/search" URL. The query parameters can be accessed through the req.query object. For example, if a request is made to "/search?query=express&sort=asc", the req.query object will contain { query: "express", sort: "asc" }. In this example, we log the req.query object to the console and send a response back to the client with a message that includes the search query and sort order.
// eg with users can be /users
// and we can have query parameters like /users?age=25&gender
// In this case, the req.query object will contain { age: "25", gender: "" }. You can use these query parameters to filter or sort the list of users based on the specified criteria. For example, you could return a list of users who are 25 years old    
// and have a specific gender. Query parameters are a common way to pass additional information in the URL and can be used to customize the response based on the client's request. 


// app.get("/search", (req, res) => {
//   console.log(req.query);
//   res.send(`Search results for query: ${req.query.query}, sorted in ${req.query.sort} order.`);
// });
// app.post("/user", async (req, res) => {
//   console.log(req.body);
//   // saving data to DB
//   res.send("Data successfully saved to the database!");
// });

// This will handle DELETE call to /user
// In this route, we are using the app.delete() method to define a route that will handle DELETE requests to the "/user" URL. The function takes two parameters: req (the request object) and res (the response object). Inside the function, we can perform the necessary operations to delete a user from the database based on the information provided in the request (e.g., user ID). After successfully deleting the user, we send a response back to the client indicating that the deletion was successful.
// app.delete("/user", (req, res) => {
//   res.send("Deleted successfully!");
// });

//app.use("/route", rH, [rH2, rH3], rH4, rh5);

// In this route, we are using the app.get() method to define a route that will handle GET requests to the "/user" URL. We have multiple route handlers (rH, rH2, rH3, rH4, rH5) defined in an array. When a request is made to this route, the handlers will be executed in the order they are defined. Each handler can perform specific tasks such as logging, processing data, or sending responses. The next() function is used to pass control to the next handler in the sequence. This allows for modular and organized code when handling complex routes with multiple operations.

// we can have multiple handlers for a single route in express. This allows us to break down the processing of a request into smaller, more manageable functions. Each handler can perform a specific task, such as logging, authentication, data processing, or sending a response. By using the next() function, we can pass control from one handler to the next, allowing for a clear and organized flow of operations when handling a request. This is particularly useful for routes that require multiple steps or operations to be performed before sending a response back to the client.
// but if any of the handler sends a response back to the client, then the subsequent handlers will not be executed. This is because once a response is sent, the request-response cycle is considered complete, and the server will not continue to execute any further handlers for that request. Therefore, it's important to ensure that you only send a response once all necessary processing is complete and that you use the next() function appropriately to control the flow of handlers in your route.
// next code will give console error because we are trying to send multiple responses for the same request. Once a response is sent, the request-response cycle is complete, and any subsequent attempts to send another response will result in an error. In this case, since we are sending a response in each handler, only the first handler will successfully send a response, and the subsequent handlers will throw an error when they attempt to send another response. To avoid this issue, you should ensure that you only send a response once all necessary processing is complete and that you use the next() function appropriately to control the flow of handlers in your route.

// when we call next() and there is no subsequent handler defined, it will result in an error because the next() function is used to pass control to the next handler in the sequence. If there are no more handlers defined after the current one, calling next() will lead to an error since there is no handler to handle the request. To avoid this issue, you should ensure that you have a proper sequence of handlers defined for your route and that you only call next() when there is a subsequent handler to handle the request.
// app.get(
//   "/user",
//   (req, res, next) => {
//     console.log("Handling the route user!!");
//     next();
//   },
//   (req, res, next) => {
//     console.log("Handling the route user 2!!");
//     // res.send("2nd Response!!");
//     next();
//   },

//   (req, res, next) => {
//     console.log("Handling the route user 3!!");
//     // res.send("3rd Response!!");
//     next();
//   },
//   (req, res, next) => {
//     console.log("Handling the route user 4!!");
//     // res.send("4th Response!!");
//     next();
//   },
//   (req, res, next) => {
//     console.log("Handling the route user 5!!");
//     res.send("5th Response!!");
//   }
// );


// generally we use app.use for middlwares. 
// In this code, we are using the app.use() method to apply middleware functions for specific routes. The adminAuth middleware is applied to all routes that start with "/admin", which means that any request to a route that begins with "/admin" will first go through the adminAuth middleware for authentication before reaching the route handlers. Similarly, the userAuth middleware is applied to the "/user/data" route, ensuring that any request to this route will require user authentication before the route handler is executed. This way, we can protect certain routes and ensure that only authorized users can access them by using middleware functions in express.

// but if /admin handler will be executed then won't the below handler for /admin/getAllData and /admin/deleteUser will not be executed because we are sending a response in the adminAuth middleware? Yes, if the adminAuth middleware sends a response (e.g., if the authentication fails and it sends a 401 Unauthorized response), then the subsequent route handlers for "/admin/getAllData" and "/admin/deleteUser" will not be executed. This is because once a response is sent, the request-response cycle is considered complete, and the server will not continue to execute any further handlers for that request. Therefore, if the adminAuth middleware determines that the request is unauthorized and sends a response, the route handlers for "/admin/getAllData" and "/admin/deleteUser" will not be reached. However, if the adminAuth middleware successfully authenticates the request and calls next(), then the subsequent route handlers will be executed as expected.
// app.use("/admin", adminAuth);

// app.get("/admin", (req, res) => {
//   res.send("Admin dashboard");
// });

// user login does not require authentication, so we do not apply the userAuth middleware to the /user/login route. This allows users to access the login endpoint without needing to be authenticated first. Once they log in successfully, they can then access protected routes that require authentication, such as /user/data, which is protected by the userAuth middleware. This way, we can ensure that only authenticated users can access certain routes while still allowing unauthenticated users to access the login functionality.
// app.post("/user/login", (req, res) => {
//   res.send("User logged in successfully!");
// });

// app.get("/user/data", userAuth, (req, res) => {
//   res.send("User Data Sent");
// });

// check users is authorized or not using userAuth middleware and then send the data to the user. If the user is not authorized, send a 401 Unauthorized response. If the user is authorized, call next() to pass control to the next handler, which will send the user data as a response. This way, we can ensure that only authorized users can access the user data endpoint, while unauthorized users will receive an appropriate error message.
// app.get("/admin/getAllData", (req, res) => {
//   res.send("All Data Sent");
// });

// app.get("/admin/deleteUser", (req, res) => {
//   res.send("Deleted a user");
// });

// Error hanlding middleware
// In this code, we are using the app.use()("/" wildcard matches all routes) method to define an error-handling middleware function. This function takes four parameters: err (the error object), req (the request object), res (the response object), and next (the next middleware function). If an error occurs in any of the route handlers or middleware functions, it will be passed to this error-handling middleware. Inside the function, we can log the error for debugging purposes and send a response back to the client indicating that something went wrong. This allows us to handle errors gracefully and provide a consistent response to the client when an error occurs in our application.
// err should be the first parameter in the error-handling middleware function because it allows us to capture and handle any errors that occur in the route handlers or other middleware functions. When an error is passed to the next() function, it will be passed as the first argument to the error-handling middleware. This way, we can access the error object and log it for debugging purposes, as well as send an appropriate response back to the client indicating that an error occurred. If we were to place the err parameter after req, res, or next, we would not be able to properly capture and handle errors in our application, which could lead to unhandled exceptions and a poor user experience. Therefore, it's important to ensure that the err parameter is the first parameter in the error-handling middleware function.
app.use("/", (err, req, res, next) => {
  if (err) {
    // Log your error
    res.status(500).send("something went wrong");
  }
});


app.get("/getUserData", (req, res) => {
  //try {
  // Logic of DB call and get user data

  throw new Error("dvbzhjf"); // this will be caught by the error-handling middleware defined above, and a 500 Internal Server Error response will be sent back to the client with the message "something went wrong". This allows us to handle unexpected errors in a centralized way and provide a consistent response to the client when an error occurs in our application.
  res.send("User Data Sent");
  //   } catch (err) {
  //     res.status(500).send("Some Error contact support team");
  //   }
});
// is this redundant? Yes, the try-catch block is redundant in this case because we are throwing an error directly in the route handler. The error will be automatically caught by the error-handling middleware defined above, so there is no need for an additional try-catch block within the route handler itself. The error-handling middleware will handle any errors that occur in the route handlers and send an appropriate response back to the client, so you can simply throw the error without needing to catch it within the route handler.
app.use("/", (err, req, res, next) => {
  if (err) {
    // Log your error
    res.status(500).send("something went wrong");
  }
});



app.listen(7777, () => { // we start the server and listen on port 7777 for incoming requests. The callback function is executed once the server is successfully started and listening.
    // what does listen do? The listen method is used to start the server and have it listen for incoming requests on a specified port. It takes two arguments: the port number and an optional callback function that is executed once the server is successfully started. When the server is listening, it can handle incoming requests and send responses back to the clients.
  console.log("Server is successfully listening on port 7777...");
});
