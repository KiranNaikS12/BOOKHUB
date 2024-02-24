const express = require('express');
const session = require('express-session')
const config = require('../config/config');
const bodyParser = require('body-parser');
const adminController = require('../controller/adminController');
const auth = require('../middleware/adminauth')

const admin_route = express();

admin_route.use(session({
    secret: config.config.secretKey,
    resave: false,
    saveUninitialized: false
}));

admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));
admin_route.set("view engine", "ejs");
admin_route.set("views", './views/admin');
admin_route.use(express.static('public'))

admin_route.get('/',auth.isLogout,adminController.loadLogin);
admin_route.post('/',adminController.verifyLogin);
admin_route.get('/home',auth.isLogin,adminController.loadHome);
admin_route.get('/profile',auth.isLogin,adminController.loadProfile)
admin_route.get('/admin-logout',auth.isLogin,adminController.logout)
admin_route.get('/forget',auth.isLogout,adminController.forgetLoad);
admin_route.post('/forget',adminController.forgetVerify);
admin_route.get('/forget-password',auth.isLogout,adminController.forgetPasswordLoad)
admin_route.post('/forget-password',adminController.resetPassword);
admin_route.get('/dashboard',auth.isLogin,adminController.loadAdminDashboard);
admin_route.get('/new-user',auth.isLogin,adminController.newUserLoad)
admin_route.post('/new-user',adminController.addNewUser)
admin_route.get('/edit-user',auth.isLogin,adminController.editUserLoad);
admin_route.post('/edit-user',adminController.updateUserLoad);
admin_route.get('/delet-user',auth.isLogin,adminController.deleteUserLoad);

//orders
admin_route.get('/list-orders',auth.isLogin,adminController.LoadOrderDetails);
admin_route.get('/order-details',auth.isLogin,adminController.ViewOrderDetails);
admin_route.post('/update-order-status', adminController.updateOrder);
admin_route.post('/remove-orderdata',auth.isLogin,adminController.deleteOrderData)

//used as a default route for adminPage
admin_route.get('*',function(req,res){
    res.redirect('/admin');
})

module.exports = admin_route;

