module.exports = {
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "DEV@Tinder$790",
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devstinder",
  port: Number(process.env.PORT) || 7777,
};
