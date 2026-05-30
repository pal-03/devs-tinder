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

