const mongoose = require("mongoose");

const connectDB = require("../config/database");
const User = require("../models/user");

const dummyUsers = [
  {
    firstName: "Aarav",
    lastName: "Sharma",
    emailId: "aarav.sharma@example.com",
    password: "pass1234",
    age: 24,
    gender: "male",
  },
  {
    firstName: "Ananya",
    lastName: "Verma",
    emailId: "ananya.verma@example.com",
    password: "pass1234",
    age: 23,
    gender: "female",
  },
  {
    firstName: "Rohan",
    lastName: "Gupta",
    emailId: "rohan.gupta@example.com",
    password: "pass1234",
    age: 27,
    gender: "male",
  },
  {
    firstName: "Meera",
    lastName: "Iyer",
    emailId: "meera.iyer@example.com",
    password: "pass1234",
    age: 25,
    gender: "female",
  },
  {
    firstName: "Kabir",
    lastName: "Mehta",
    emailId: "kabir.mehta@example.com",
    password: "pass1234",
    age: 28,
    gender: "male",
  },
  {
    firstName: "Ishita",
    lastName: "Singh",
    emailId: "ishita.singh@example.com",
    password: "pass1234",
    age: 22,
    gender: "female",
  },
  {
    firstName: "Arjun",
    lastName: "Nair",
    emailId: "arjun.nair@example.com",
    password: "pass1234",
    age: 26,
    gender: "male",
  },
  {
    firstName: "Priya",
    lastName: "Reddy",
    emailId: "priya.reddy@example.com",
    password: "pass1234",
    age: 24,
    gender: "female",
  },
];

const seedUsers = async () => {
  try {
    await connectDB();

    const operations = dummyUsers.map((user) => ({
      updateOne: {
        filter: { emailId: user.emailId },
        update: { $set: user },
        upsert: true,
      },
    }));

    const result = await User.bulkWrite(operations);
    const totalUsers = await User.countDocuments();

    console.log("Users seed completed.");
    console.log(`Inserted: ${result.upsertedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);
    console.log(`Total users in collection: ${totalUsers}`);
  } catch (error) {
    console.error("Users seed failed.");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedUsers();
