const express = require("express");
const profileRouter = express.Router(); // Creating a new router instance for profile routes

// how does app.get and profileRouter.get are different?
// app.get is used to define a route handler for the root path ("/") of the application,
//  while profileRouter.get is used to define a route handler for the "/profile" path 
// within the profileRouter.
//  The profileRouter can be mounted on a specific path in the main application 
// using app.use, allowing you to organize your routes more modularly.
//  For example, if you mount profileRouter on "/user",
//  then the route defined as profileRouter.get("/profile") 
// would actually be accessible at "/user/profile" in the main application.
//  This helps in keeping related routes together and makes the codebase more maintainable.
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");

// Profile API - GET /profile - get the profile of the logged-in user

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;

    res.send(user);
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

// Profile API - PATCH /profile/edit - edit the profile of the logged-in user
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
    // The validateEditProfileData function is called to check if the fields being edited 
    // in the user profile are allowed to be edited. If the validation fails
    //  (i.e., if there are fields in the request body that are not included in the 
    // allowedEditFields array), an error is thrown with the message "Invalid Edit Request"
    // . This ensures that only specific fields can be edited in the user profile, and any attempt to edit unauthorized fields will result in an error response.
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request");
    }

    const loggedInUser = req.user; // got the user from the userAuth middleware 
    // and stored it in loggedInUser variable

    // We are using Object.keys(req.body) to get an array of the keys
    //  (field names) in the request body, and then we are using forEach to iterate 
    // over each key. For each key, we are updating the corresponding field in the 
    // loggedInUser object with the value from req.body. This allows us to dynamically 
    // update only the fields that are included in the request body, while keeping the
    //  rest of the user profile unchanged.
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

    // After updating the fields in the loggedInUser object, we call await loggedInUser.save()
    //  to save the changes to the database. This ensures that the updated profile information
    //  is persisted in the database and can be retrieved later when needed.
    await loggedInUser.save();

    // res.json is used to send a JSON response back to the client.
    //  In this case, we are sending an object that contains a message indicating 
    // that the profile was updated successfully, along with the updated user data
    //  (loggedInUser). This allows the client to receive feedback about the success
    //  of the profile update operation and also provides the updated user information 
    // in the response.
    res.json({
      message: `${loggedInUser.firstName}, your profile updated successfuly`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});
module.exports = profileRouter;