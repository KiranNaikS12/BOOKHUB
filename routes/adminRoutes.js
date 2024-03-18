const express = require('express');
const session = require('express-session')
const config = require('../config/config');
const bodyParser = require('body-parser');
const adminController = require('../controller/adminController');
const couponController = require('../controller/couponController');
const auth = require('../middleware/adminauth');


const admin_route = express();


admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));
admin_route.set("view engine", "ejs");
admin_route.set("views", './views/admin');
admin_route.use(express.static('public'));



admin_route.get('/',auth.isAdminLogout,adminController.loadLogin);
admin_route.post('/',auth.isAdminLogout,adminController.verifyLogin);
admin_route.get('/home',auth.isAdminLogin,adminController.loadHome);
admin_route.get('/profile',auth.isAdminLogin,adminController.loadProfile)
admin_route.get('/admin-logout',auth.isAdminLogin,adminController.logout)
admin_route.get('/forget',auth.isAdminLogout,adminController.forgetLoad);
admin_route.post('/forget',adminController.forgetVerify);
admin_route.get('/forget-password',auth.isAdminLogout,adminController.forgetPasswordLoad)
admin_route.post('/forget-password',adminController.resetPassword);
admin_route.get('/dashboard',auth.isAdminLogin,adminController.loadAdminDashboard);
admin_route.get('/new-user',auth.isAdminLogin,adminController.newUserLoad)
admin_route.post('/new-user',adminController.addNewUser)
admin_route.get('/edit/user',auth.isAdminLogin,adminController.editUserLoad);
admin_route.post('/edit/user',adminController.updateUserLoad);
admin_route.get('/remove/user',auth.isAdminLogin,adminController.deleteUserLoad);

//orders
admin_route.get('/order/lists',auth.isAdminLogin,adminController.LoadOrderDetails);
admin_route.get('/order/detail',auth.isAdminLogin,adminController.ViewOrderDetails);
admin_route.post('/order/status', adminController.updateOrder);
admin_route.put('/order/remove',auth.isAdminLogin,adminController.deleteOrderData);
admin_route.post('/order/return-status',auth.isAdminLogin,adminController.updateReturnOrder);

//coupon-management
admin_route.get('/coupon',auth.isAdminLogin,adminController.loadCouponPage);
admin_route.post('/add/coupon',adminController.addCouponData);
admin_route.get('/view/coupons',auth.isAdminLogin,adminController.viewCouponList);
admin_route.get('/update/coupon',auth.isAdminLogin,adminController.loadUpdateCoupanPage);
admin_route.post('/update/coupon',adminController.updateCouponDetails);
admin_route.get('/remove/coupon',auth.isAdminLogin,adminController.removeCoupon);

//Sales-Report:
admin_route.get('/sales/report',auth.isAdminLogin,adminController.loadSalesReport);
admin_route.get('/filter/sales',auth.isAdminLogin,adminController.filterSalesReport);
admin_route.get('/filter/revenue',auth.isAdminLogin,adminController.filterTotalRevenue);

//used as a default route for adminPage
admin_route.get('*',function(req,res){
    res.redirect('/admin/home');
})

module.exports = admin_route;

