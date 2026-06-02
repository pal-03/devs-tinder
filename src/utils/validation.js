const validator = require("validator");

const validateSignUpData = (req) => {
    // The validateSignUpData function is a custom validation function that checks the validity of the user input data during the sign-up process. It takes the request object (req) as an argument and extracts the firstName, lastName, emailId, and password fields from the request body. It then performs a series of checks to validate the data:
    // 1. It checks if the firstName and lastName fields are present. If either of them is missing, it throws an error with the message "Name is not valid!".
    // 2. It uses the validator library to check if the emailId field contains a valid email address. If it is not a valid email address, it throws an error with the message "Email is not valid!".
    // 3. It uses the validator library to check if the password field meets certain strength requirements (e.g., minimum length, presence of uppercase letters, numbers, etc.). If the password does not meet these requirements, it throws an error with the message "Please enter a strong Password!".
    // By performing these validations, we can ensure that the user input data is in the correct format and meets the specified criteria before it is processed further in the sign-up process.
  const { firstName, lastName, emailId, password } = req.body;
  if (!firstName || !lastName) {
    throw new Error("Name is not valid!");
  } else if (!validator.isEmail(emailId)) {
    throw new Error("Email is not valid!");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error("Please enter a strong Password!");
  }
};

module.exports = {
  validateSignUpData,
};