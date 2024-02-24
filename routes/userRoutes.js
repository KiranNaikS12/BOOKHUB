const express = require('express');
const {body, validationResult} = require('express-validator')
const flash = require('express-flash')
const session = require('express-session')
const config = require('../config/config');
const auth = require('../middleware/userauth');
const cart = require('../controller/cartController');
const order = require('../controller/checkoutController');

const user_route = express();


// Session
user_route.use(
    session({
        secret: config.config.secretKey,
        resave: false,
        saveUninitialized: false
    })
);


//flash-message
user_route.use(flash());

//view engine
user_route.set("view engine", "ejs");
user_route.set("views", './views/users');

//To server static file
user_route.use(express.static('public'));

//body-parser
const bodyParser = require('body-parser');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({extended:true}))

const userController = require('../controller/userController')

user_route.get('/', auth.isLogout, userController.loadLandindPage);

user_route.get('/register', auth.isLogout, userController.loadRegister);
user_route.post('/register', userController.insertUser);

user_route.get('/verify-otp', auth.isLogout,userController.loadOtp);
user_route.post('/verify-otp', userController.verifyOTP);

user_route.get('/login', auth.isLogout, userController.loadLoginPage);
user_route.post('/login', userController.verifyLogin);

user_route.get('/home', auth.isLogin, userController.loadHomePage);
user_route.get('/profile',auth.isLogin,userController.loadProfilePage);
user_route.get('/edit-user',auth.isLogin,userController.loadEditUser);
user_route.post('/edit-user',userController.userUpdateLoad);
user_route.post('/profile',auth.isLogin,userController.insertAddress);
user_route.get('/edit-address',auth.isLogin,userController.loadupdateUserAddress);
user_route.post('/edit-address',auth.isLogin,userController.updateUserAddress);
user_route.get('/delete-address',auth.isLogin,userController.deleteUserAddress)

user_route.get('/forget', auth.isLogout,userController.forgetLoad);
user_route.post('/forget', userController.forgetVerify)
user_route.get('/forget-password',auth.isLogout,userController.forgetPasswordLoad)
user_route.post('/forget-password',userController.resetPassword);

user_route.get('/product-list',auth.isLogin,userController.loadProduct)
user_route.get('/product-view',auth.isLogin,userController.LoadIndIvidualProduct)
user_route.get('/api/popular-products',auth.isLogin,userController.getPopularProducts);
user_route.get('/api/all-products',auth.isLogin,userController.getAllProducts);
//cart
user_route.get('/cart',auth.isLogin,cart.loadCartPage)
user_route.post('/add-to-cart',auth.isLogin,cart.addToCart);
user_route.post('/updateQuantity',auth.isLogin,cart.updateQuantity);
user_route.post('/remove-product',auth.isLogin,cart.removeProduct);
user_route.post('/clear-cart',auth.isLogin,cart.clearEntireCart);

//checkout
user_route.get('/checkout',auth.isLogin,order.loadCheckoutPage);
user_route.post('/order-page',auth.isLogin,order.addOrderDetails);

user_route.get('/order-summary',auth.isLogin,order.loadOrderSummary);
user_route.get('/order-history',auth.isLogin,order.loadOrderHistory);
user_route.post('/cancel-order',auth.isLogin,order.cancelOrder);

user_route.get('/logout', auth.isLogin, userController.userLogout)

module.exports = {
    user_route
}