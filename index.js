require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const session = require("express-session");
const config = require("./config/config");
const nocache = require("nocache");
// const morgan = require("morgan");
const PORT = process.env.PORT || 4000;
//connecting mongoose
async function connectToDatabase() {
  try {
    await mongoose.connect(
      "mongodb://127.0.0.1:27017/bookhub_management_system"
    );
    console.log(`connected with mongodb`);
  } catch (error) {
    console.log(`Error connecting database:${error.message}`);
  }
}

app.use(
  session({
    secret: config.config.secretKey,
    resave: false,
    saveUninitialized: false,
  })
);

connectToDatabase();
// app.use(morgan("dev"));
app.use(nocache());
//importing routes
const userRoute = require("./routes/userRoutes");
const adminRoute = require("./routes/adminRoutes");
const productRoute = require("./routes/productRoutes");
const categoryRoute = require("./routes/categoryRoutes");

app.use("/admin/category", categoryRoute.cat_route);
app.use("/admin/product", productRoute.product_route);
app.use("/admin", adminRoute);
app.use("/", userRoute.user_route);

//connecting
app.listen(PORT, () => {
  console.log(`Application is listening at http://localhost:${PORT}`);
});
