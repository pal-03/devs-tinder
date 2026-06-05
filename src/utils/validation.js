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

// The validateEditProfileData function is a custom validation function that checks
//  if the fields being edited in the user profile are allowed to be edited.
//  It takes the request object (req) as an argument and defines an array of
//  allowedEditFields, which includes the fields that are permitted to be edited
//  (firstName, lastName, email
const validateEditProfileData = (req) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "emailId",
    "photoUrl",
    "gender",
    "age",
    "about",
    "skills",
  ];

  // The function uses Object.keys(req.body) to get an array of the keys (field names)
  //  in the request body, and then it uses the every method to check if every key 
  // in the request body is included in the allowedEditFields array.
  //  If there is any key in the request body that is not included in the allowedEditFields 
  // array, the function will return false, indicating that the edit request is invalid.
  //  If all keys in the request body are included in the allowedEditFields array, 
  // the function will return true, indicating that the edit request is valid.
  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );

  return isEditAllowed;
};

module.exports = {
  validateSignUpData,
  validateEditProfileData,
};