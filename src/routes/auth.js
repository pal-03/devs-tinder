const express = require("express");
const authRouter = express.Router(); // Creating a new router instance for authentication 
// routes

const { validateSignUpData } = require("../utils/validation");
const User = require("../models/user");
const bcrypt = require("bcrypt");

authRouter.post("/signup", async (req, res) => {
  try {
    // Validation of data
    validateSignUpData(req);

    const { firstName, lastName, emailId, password, age, gender, photoUrl, about, skills } = req.body;

    // Encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);

    //   Creating a new instance of the User model
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
      age,
      gender,
      photoUrl,
      about,
      skills,
    });

    const savedUser = await user.save();
    const token = await savedUser.getJWT();

    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
    });

    res.json({ message: "User Added successfully!", data: savedUser });
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      return res.status(400).send("ERROR : Email and password are required");
    }

    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      // Generate a JWT token for the authenticated user
      // Assuming the User model has a method to generate JWT tokens

      const token = await user.getJWT();

      // Set the token in an HTTP-only cookie that expires in 8 hours
      res.cookie("token", token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: true, // This flag ensures that the cookie cannot be accessed via
        //  client-side JavaScript, enhancing security by preventing potential cross-site
        //  scripting (XSS) attacks from stealing the token.
        sameSite: "lax", // This flag helps mitigate CSRF attacks by restricting the cookie to be sent only
        //  in same-site requests, while still allowing it to be sent in top-level navigation
        //  and GET requests initiated by third-party websites.
      });
      res.json({ message: "Login Successful!", data: user });
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

// The /logout endpoint is used to log out a user by clearing the authentication token 
// stored in the client's cookies.
//  When a POST request is made to the /logout endpoint, the server responds by setting
//  the "token" cookie to null and expiring it immediately. This effectively removes the
//  authentication token from the client's browser, logging the user out of the application
// . After clearing the cookie, the server sends a response indicating that the logout was
//  successful.
authRouter.post("/logout", async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
  });
  res.send("Logout Successful!!");
});

module.exports = authRouter;
