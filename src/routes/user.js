const express = require("express");
const userRouter = express.Router(); // create a user router instance using the Express Router

const User = require("../models/user");

const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest"); // Importing the ConnectionRequest model, 
// which is likely used to handle connection requests between users in the application
// . This model will be used to interact with the connection requests collection in 
// the MongoDB database, allowing us to create, read, update, and delete connection 
// request documents as needed in the user-related routes defined in this router.

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";

// The code defines a GET route for retrieving all pending connection requests received by the logged-in user. The route is defined at the path "/user/requests/received" and is protected by the userAuth middleware, which ensures that only authenticated users can access this endpoint. When a GET request is made to this route, the server will execute the provided asynchronous function to handle the logic for fetching the pending connection requests for the logged-in user.

// Get all the pending connection request for the loggedIn user
// This API endpoint allows the logged-in user to retrieve all pending connection
//  requests that they have received from other users. When a GET request is made 
// to the /user/requests/received endpoint, the server will first authenticate the user
//  using the userAuth middleware. If the user is authenticated successfully, it will
//  then query the ConnectionRequest collection in the database to find all connection 
// requests where the toUserId matches the logged-in user's ID and the status is
//  "interested". The results will be populated with the fromUserId field,
//  which will include specific details (firstName, lastName, photo URL, age,   
// gender, about, skills) of the users who sent the connection requests. Finally, 
// the server will return a JSON response containing a message and the data of
//  the pending connection requests received by the logged-in user.
//  If there is an error during this process, it will return a 400 status code
//  with an error message.
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    // get logged in user details from the request object (req.user) and
    //  store it in the loggedInUser variable.
    const loggedInUser = req.user;

    // The code then queries the ConnectionRequest collection in the database
    //  to find all connection requests where the toUserId matches the logged-in
    //  user's ID and the status is "interested". It uses the find method to
    //  retrieve these connection requests and populates the fromUserId field 
    // with specific details (firstName, lastName, photo URL, age, gender, about, skills)
    //  of the users who sent the connection requests using the populate method.
    //  The results are stored in the connectionRequests variable. 

    // we can use the populate because fromUserId is a reference to the User model in 
    // the ConnectionRequest schema.
    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA);
    // .populate(
    //   "fromUserId",
    //   "firstName lastName photoUrl age gender about skills"
    // );
    // }).populate("fromUserId", ["firstName", "lastName"]);

    res.json({
      message: "Data fetched successfully",
      data: connectionRequests,
    });
  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
  }
});

// The code also defines another GET route for retrieving all connections
//  of the logged-in user. This route is defined at the path "/user/connections"
//  and is also protected by the userAuth middleware. When a GET request is made
//  to this route, the server will execute the provided asynchronous function 
// to handle the logic for fetching the connections of the logged-in user.
//  The function will query the ConnectionRequest collection to find all connection
//  requests where either the toUserId or fromUserId matches the logged-in user's ID 
// and the status is "accepted". It will then populate both the fromUserId and toUserId
//  fields with specific details of the users involved in these accepted connection requests.
//  Finally, it will return a JSON response containing the data of all connections for the
//  logged-in user. If there is an error during this process, it will return a 400 status
//  code with an error message.
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // The code then queries the ConnectionRequest collection to find all connection requests
    //  where either the toUserId or fromUserId matches the logged-in user's ID and the status is "accepted". 
    // It uses the find method with an $or operator to specify that either condition can be true for a document to match the query. The results are stored in the connectionRequests variable. 
    // The code also populates both the fromUserId and toUserId fields with specific details of the users involved in these accepted connection requests using the populate method. This allows us to retrieve relevant information about both users in each connection request, which can be useful for displaying connections in the user interface or for further processing in the application.
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA);

    console.log(connectionRequests);

    // The code then maps over the connectionRequests array to create a new array called data.
    //  For each connection request, it checks if the fromUserId matches the logged-in user's 
    // ID. If it does, it means that the logged-in user is the sender of the connection
    //  request, so it returns the toUserId (the recipient) as part of the data array.
    //  If the fromUserId does not match the logged-in user's ID, it means
    //  that the logged-in user is the recipient of the connection request, 
    // so it returns the fromUserId (the sender) as part of the data array. 
    // This way, we can extract the relevant user information for each connection
    //  request and return it in a format that can be easily used in the client application
    //  to display connections for the logged-in user.

    //either fromUserId or toUserId will be the logged in user, 
    // so we will return the other one as connection
    const data = connectionRequests.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });

    res.json({ data });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = userRouter;