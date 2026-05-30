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
app.get("/user", (req, res) => {
  res.send({ firstName: "Swayam", lastName: "Pal" });
});

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


app.get("/search", (req, res) => {
  console.log(req.query);
  res.send(`Search results for query: ${req.query.query}, sorted in ${req.query.sort} order.`);
});
app.post("/user", async (req, res) => {
  console.log(req.body);
  // saving data to DB
  res.send("Data successfully saved to the database!");
});

// This will handle DELETE call to /user
// In this route, we are using the app.delete() method to define a route that will handle DELETE requests to the "/user" URL. The function takes two parameters: req (the request object) and res (the response object). Inside the function, we can perform the necessary operations to delete a user from the database based on the information provided in the request (e.g., user ID). After successfully deleting the user, we send a response back to the client indicating that the deletion was successful.
app.delete("/user", (req, res) => {
  res.send("Deleted successfully!");
});

app.listen(7777, () => { // we start the server and listen on port 7777 for incoming requests. The callback function is executed once the server is successfully started and listening.
    // what does listen do? The listen method is used to start the server and have it listen for incoming requests on a specified port. It takes two arguments: the port number and an optional callback function that is executed once the server is successfully started. When the server is listening, it can handle incoming requests and send responses back to the clients.
  console.log("Server is successfully listening on port 7777...");
});