const express = require('express');
const {body, validationResult} = require('express-validator')
const flash = require('express-flash')
const session = require('express-session')
const config = require('../config/config');
const auth = require('../middleware/userauth');
const cart = require('../controller/cartController');
const order = require('../controller/checkoutController');
const wishlistController = require('../controller/wishlistController');
const payment = require('../controller/paymentController');
const coupon = require('../controller/couponController');

const user_route = express();


// Session

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
user_route.post('/resend-otp',userController.resendOTP);

user_route.get('/login', auth.isLogout, userController.loadLoginPage);
user_route.post('/login', userController.verifyLogin);

user_route.get('/home', auth.isLogin, userController.loadHomePage);
user_route.get('/profile',auth.isLogin,userController.loadProfilePage);
user_route.get('/user/edit',auth.isLogin,userController.loadEditUser);
user_route.post('/user/edit',userController.userUpdateLoad);
user_route.post('/profile',auth.isLogin,userController.insertAddress);
user_route.get('/edit/address',auth.isLogin,userController.loadupdateUserAddress);
user_route.post('/edit/address',auth.isLogin,userController.updateUserAddress);
user_route.get('/remove/address',auth.isLogin,userController.deleteUserAddress)

user_route.get('/forget', auth.isLogout,userController.forgetLoad);
user_route.post('/forget', userController.forgetVerify)
user_route.get('/forget-password',auth.isLogout,userController.forgetPasswordLoad)
user_route.post('/forget-password',userController.resetPassword);

user_route.get('/product-list',auth.isLogin,userController.loadProduct)
user_route.get('/product/view',auth.isLogin,userController.LoadIndIvidualProduct)


//cart
user_route.get('/cart',auth.isLogin,cart.loadCartPage)
user_route.post('/add/cart',auth.isLogin,cart.addToCart);
user_route.post('/updateQuantity',auth.isLogin,cart.updateQuantity);
user_route.post('/remove-product',auth.isLogin,cart.removeProduct);
user_route.post('/clear-cart',auth.isLogin,cart.clearEntireCart);

//checkout
user_route.get('/checkout',auth.isLogin,order.loadCheckoutPage);
user_route.post('/product/checkout',order.addToCheckout)
user_route.put('/product/quantity',order.updateInQuantity);
user_route.put('/add/order',auth.isLogin,order.addOrderDetails);
user_route.patch('/remove/orders',order.removeProductOrder)

user_route.get('/orders',auth.isLogin,order.loadOrderSummary);
user_route.get('/orders/history',auth.isLogin,order.loadOrderHistory);
user_route.patch('/orders/:orderId',auth.isLogin,order.cancelOrder);
user_route.get('/track-order',auth.isLogin,order.loadOrderTrack);
user_route.put('/orders/return',order.sendReturnRequest);

//category
user_route.get('/category',auth.isLogin,userController.loadCategoryPage);
user_route.get('/category/filter',auth.isLogin,userController.filterProducts);
user_route.get('/category/popularity',auth.isLogin,userController.filterPopularity);
user_route.get('/products/category',auth.isLogin,userController.loadDistinctCategory)

//search and sorting
user_route.get('/search',auth.isLogin,userController.searchProduct)
user_route.get('/products/filter',auth.isLogin,userController.loadProductFilter);
user_route.get('/products/filter/popularity',auth.isLogin,userController.productFilterPopularity)
//review
user_route.post('/reviews',auth.isLogin,userController.sendReview);
//password
user_route.get('/password',auth.isLogin,userController.LoadchangePassword);
user_route.post('/password',auth.isLogin,userController.changePassword);

//whislist
user_route.get('/wishlist',auth.isLogin,wishlistController.loadWhislist);
user_route.post('/add/wishlist',wishlistController.addToWhislist);
user_route.post('/remove/wishlist',wishlistController.removeWishlist);

//payment-RazorPay
user_route.post('/create/razorypay-order',auth.isLogin,payment.handleRazorPayOrderCreation);

//Payment-wallet
user_route.get('/wallet',auth.isLogin,payment.loadWallet);
user_route.post('/add/wallet',auth.isLogin,payment.addWallet);
user_route.post('/create/wallet-order',payment.handleWalletPaymentOrderCreation);
user_route.get('/view/payments',auth.isLogin,payment.loadPaymentHistory)

//coupon
user_route.get('/coupon',auth.isLogin,coupon.loadCouponPage);
user_route.post('/apply/coupon',coupon.applyCoupon)

user_route.get('/logout', auth.isLogin, userController.userLogout)

user_route.get('*',function(req,res){
    res.redirect('/')
})

module.exports = {
    user_route
}