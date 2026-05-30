// nodemon
// what does this do ?
// nodemon is a utility that will monitor for any changes in your source and automatically restart your server. Perfect for development. It is a replacement wrapper for node.

// It is a command-line tool that helps developers by automatically restarting the Node.js application whenever it detects changes in the source code. This is particularly useful during development, as it eliminates the need to manually stop and restart the server every time you make changes to your code. With nodemon, you can focus on writing code without worrying about restarting the server, which can speed up the development process and improve productivity.

// HTTP methods
// HTTP methods are a set of request methods used in the Hypertext Transfer Protocol (HTTP) to indicate the desired action to be performed on a resource. The most common HTTP methods include:

// 1. GET: The GET method is used to retrieve data from a server. It is a read-only operation and should not have any side effects on the server. For example, when you visit a webpage, your browser sends a GET request to the server to fetch the content of that page.(idempotent)
// idempotent means that multiple identical requests will have the same effect as a single request. In the case of GET, making the same GET request multiple times will not change the state of the server or the resource being accessed. This is because GET requests are designed to retrieve data without modifying it, so they do not have any side effects on the server or the resource.

// 2. POST: The POST method is used to submit data to be processed to a specified resource. It is often used when submitting form data or uploading files. Unlike GET, POST requests can have side effects on the server, such as creating new resources or updating existing ones.

// 3. PUT: The PUT method is used to update an existing resource or create a new resource if it does not exist. It is idempotent, meaning that multiple identical requests will have the same effect as a single request.  (idempotent)
// In the case of PUT, making the same PUT request multiple times will have the same effect as making it once. This is because PUT requests are designed to update or create resources in a way that does not change the state of the server or the resource being modified. If you send the same PUT request multiple times, it will either update the resource to the same state or create a new resource with the same data, resulting in no additional changes to the server or resource.      

// 4. DELETE: The DELETE method is used to delete a specified resource from the server. It is also idempotent, meaning that multiple identical requests will have the same effect as a single request.

// 5. PATCH: The PATCH method is used to apply partial modifications to a resource. It is not idempotent, meaning that multiple identical requests may have different effects. 

// what are middlewares ?
// Middleware functions are functions that have access to the request object (req), the response object (res), and the next middleware function in the application’s request-response cycle. These functions can perform various tasks such as executing code, making changes to the request and response objects, ending the request-response cycle, or calling the next middleware function in the stack. Middleware is commonly used for tasks like authentication, logging, error handling, and more. It allows developers to modularize their code and separate concerns, making it easier to manage and maintain the application.

// In the context of Express.js, middleware functions are executed in the order they are defined. When a request is made to the server, it passes through each middleware function until it reaches the route handler that matches the request. If a middleware function does not end the request-response cycle (by sending a response or calling next()), it will pass control to the next middleware function in the stack. This allows for a flexible and powerful way to handle various aspects of the application’s functionality.

// In the provided code snippet, we have two middleware functions: adminAuth and userAuth. These functions are responsible for checking the authorization of admin and user requests, respectively. They check for a specific token and determine if the request is authorized. If the request is not authorized, they send a 401 Unauthorized response. If the request is authorized, they call next() to pass control to the next middleware function or route handler in the stack.

// app.use vs app.all 
// app.use() is a method in Express.js that is used to apply middleware functions to the application. It can be used to apply middleware to all routes or specific routes. When you use app.use(), the middleware function will be executed for every request that matches the specified route(s). For example, if you use app.use("/admin", adminAuth), the adminAuth middleware will be executed for every request that starts with "/admin".

// On the other hand, app.all() is a method in Express.js that is used to define a route handler for all HTTP methods (GET, POST, PUT, DELETE, etc.) for a specific route. When you use app.all(), the route handler will be executed for any HTTP method that matches the specified route. For example, if you use app.all("/admin", adminAuth), the adminAuth route handler will be executed for any HTTP method (GET, POST, etc.) that starts with "/admin".

// In summary, app.use() is used to apply middleware functions to routes, while app.all() is used to define route handlers for all HTTP methods for a specific route.

