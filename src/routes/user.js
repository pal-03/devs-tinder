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


// The code also defines another GET route for retrieving a feed of users for the 
// logged-in user. This route is defined at the path "/feed" and is protected by 
// the userAuth middleware. When a GET request is made to this route,
//  the server will execute the provided asynchronous function to handle the logic for
//  fetching a feed of users for the logged-in user. The function will 
// first retrieve all connection requests where either the fromUserId or toUserId matches
//  the logged-in user's ID. It will then create a set of user IDs to hide from the feed,
//  which includes both the fromUserId and toUserId of these connection requests. Finally, 
// it will query the User collection to find all users whose IDs are not in the set of
//  hidden user IDs and are not equal to the logged-in user's ID, and return this data
//  in a JSON response. If there is an error during this process, it will return a
//  400 status code with an error message.
userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    // get the logged in user's details from the request object (req.user)
    //  and store it in the loggedInUser variable.
    const loggedInUser = req.user;

    // get page and limit from query params for pagination, 
    // if not provided set default values
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    // The code then retrieves all connection requests where either the fromUserId 
    // or toUserId matches the logged-in user's ID. It uses the find method with an
    //  $or operator to specify that either condition can be true for a document 
    // to match the query. The results are stored in the connectionRequests variable. 

    // The code then creates a set of user IDs to hide from the feed, which includes 
    // both the fromUserId and toUserId of these connection requests. 
    // It iterates over the connectionRequests array and adds both the
    //  fromUserId and toUserId to the hideUsersFromFeed set. This way, 
    // we can keep track of all users who have a connection request with the
    //  logged-in user, whether they are the sender or recipient of the request.
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId  toUserId"); // send only fromUserId and toUserId in the result
    //  as we only need these fields to hide users from feed
    // we can use populate here to get the user details of fromUserId and toUserId,
    //  but it will be an additional overhead as we only need the user IDs to hide
    //  from feed, so we can directly use the ObjectId values of fromUserId and toUserId
    //  without populating them.

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    // The code then queries the User collection to find all users whose IDs
    //  are not in the set of hidden user IDs and are not equal to the logged-in user's 
    // ID. It uses the find method with $and and $nin operators to specify these conditions. 
    // The results are stored in the users variable. Finally, it returns this
    //  data in a JSON response. If there is an error during this process, 
    // it will return a 400 status code with an error message.


    // $nin operator is used to specify that the _id field of the user documents
    //  should not be in the array of hidden user IDs (hideUsersFromFeed)
    //  and should not be equal to the logged-in user's ID (loggedInUser._id).
    //  This ensures that we only retrieve users who are not connected to the 
    // logged-in user and are not the logged-in user themselves,
    //  effectively creating a feed of potential new connections for the user.

    // $ne operator is used to specify that the _id field of the user documents 
    // should not be equal to the logged-in user's ID (loggedInUser._id). 
    // This ensures that we do not include the logged-in user in their 
    // own feed of potential connections.
    const users = await User.find({
      $and: [
        { _id: { $nin: Array.from(hideUsersFromFeed) } },
        { _id: { $ne: loggedInUser._id } },
      ],
    })
      .select(USER_SAFE_DATA) // do not send pwd and emailId in the result
      .skip(skip) // The skip method is used to skip a certain number of documents
      //  in the result set based on the page and limit values for pagination. 
      // It calculates the number of documents to skip by multiplying the (page - 1) 
      // by the limit, allowing us to retrieve the correct set of users
      //  for the requested page.
      .limit(limit);

      // The code then returns the data of the users in a JSON response.
      //  If there is an error during this process, it will return a 400 
      // status code with an error message.
    res.json({ data: users });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = userRouter;
