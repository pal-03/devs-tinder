const express = require("express");
const requestRouter = express.Router();
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

const sendEmail = require("../utils/sendEmail");

const { userAuth } = require("../middlewares/auth");

// The code defines a POST route for sending connection requests between users.
//  The route is defined at the path "/request/send/:status/:toUserId",
//  where :status is a parameter that indicates the status of the connection request 
// (e.g., "interested" or "ignored"), and :toUserId is a parameter that 
// specifies the ID of the user to whom the connection request is being sent
// . The route is protected by the userAuth middleware, which ensures that 
// only authenticated users can access this endpoint. When a POST request is made
//  to this route, the server will execute the provided asynchronous function to handle
//  the logic for sending a connection request from the authenticated user to the
//  specified recipient user with the given status.
requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      // Extracting the fromUserId from the authenticated user's information (req.user._id),
      //  the toUserId from the request parameters (req.params.toUserId), 
      // and the status of the connection request from the request parameters
      //  (req.params.status). These values will be used to create a new connection 
      // request document in the database.
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;

      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: "Invalid status type: " + status });
      }

      // The code then checks if the toUserId corresponds to a valid user in the database
      //  by using the User model's findById method. If no user is found with the
      //  given toUserId, it returns a 404 status code with a "User not found!"
      //  message. This ensures that connection requests can only be sent to existing 
      // users in the system.
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(404).json({ message: "User not found!" });
      }

      // The code then checks if a connection request already exists between the fromUserId and toUserId
      //  by querying the ConnectionRequest collection in the database.
      //  It uses the $or operator
      //  to check for both possible combinations of fromUserId and toUserId 
      // (i.e., fromUserId to toUserId and from toUserId to fromUserId).
      //  If an existing connection request is found, it returns a 400 status 
      // code with a "Connection Request Already Exists!!" message.
      //  This prevents duplicate connection requests from being created between the
      //  same users.
      // findOne method is used to find a single document in the ConnectionRequest
      //  collection that matches the specified criteria. In this case, 
      // it checks for a connection request where either the fromUserId matches
      //  the provided fromUserId and the toUserId matches the provided toUserId,
      //  or vice versa. 

      // $or operator is used to specify that either of the conditions can be true
      //  for a document to match the query.
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      if (existingConnectionRequest) {
        return res
          .status(400)
          .send({ message: "Connection Request Already Exists!!" });
      }

      // If no existing connection request is found, 
      // the code creates a new instance of the ConnectionRequest model
      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      // The new connection request document is then saved to the database using
      //  the save method.
      const data = await connectionRequest.save();

      // After saving the connection request, the code sends an email notification
      //  to the recipient user (toUser) using the sendEmail utility function. 
      // The email includes a subject indicating that there is a new friend request
      //  from the sender (req.user.firstName) and a body that describes the status
      //  of the connection request (e.g., "interested" or "ignored") in relation
      //  to the recipient user (toUser.firstName). The result is returned as a compact
      //  email status so the request can still succeed if notification delivery fails.
      let emailStatus = { sent: false };
      try {
        const emailRes = await sendEmail.run(
          "A new friend request from " + req.user.firstName,
          req.user.firstName + " is " + status + " in " + toUser.firstName
        );

        emailStatus = emailRes.skipped
          ? { sent: false, skipped: true, reason: emailRes.reason }
          : { sent: true, messageId: emailRes.MessageId };
      } catch (emailErr) {
        emailStatus = {
          sent: false,
          error: emailErr.name || "EmailSendFailed",
        };
      }

      res.json({
        message:
          req.user.firstName + " is " + status + " in " + toUser.firstName,
        data,
        email: emailStatus,
      });
    } catch (err) {
      res.status(400).send("ERROR: " + err.message);
    }
  }
);

// The code also defines another POST route for reviewing connection requests.
//  This route is defined at the path "/request/review/:status/:requestId",
//  where :status is a parameter that indicates the new status of the connection
//  request (e.g., "accepted" or "rejected"), and :requestId is a parameter that
//  specifies the ID of the connection request being reviewed. Similar to the
//  previous route, this route is also protected by the userAuth middleware to
//  ensure that only authenticated users can access it. When a POST request is made
//  to this route, the server will execute the provided asynchronous function to handle
//  the logic for reviewing a connection request and updating its status accordingly.
requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      // Extracting the logged-in user's information from req.user, 
      // the new status of the connection request from req.params.status, 
      // and the ID of the connection request being reviewed from req.params.requestId.
      //  These values will be used to find the specific connection request in the database and update its status based on the review action taken by the user.
      const loggedInUser = req.user;
      const { status, requestId } = req.params;

      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Status not allowed!" });
      }

      // The code then checks if the connection request with the specified requestId exists in the database
      //  and if it is directed to the logged-in user (toUserId matches loggedInUser._id) 
      // and has a current status of "interested". If no such connection request is found, 
      // it returns a 404 status code with a "Connection request not found" message. 
      // This ensures that users can only review connection requests that are actually sent to them and are currently in an "interested" state.
      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });
      if (!connectionRequest) {
        return res
          .status(404)
          .json({ message: "Connection request not found" });
      }

      // If the connection request is found, the code updates its status to the new
      //  status provided in the request parameters (either "accepted" or "rejected").
      connectionRequest.status = status;

      // The updated connection request document is then saved back to the
      //  database using the save method.
      const data = await connectionRequest.save();

      res.json({ message: "Connection request " + status, data });
    } catch (err) {
      res.status(400).send("ERROR: " + err.message);
    }
  }
);


module.exports = requestRouter;
