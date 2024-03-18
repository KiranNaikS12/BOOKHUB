const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring')
const config = require('../config/config');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Return = require('../models/orderReturn');
const Coupon = require('../models/couponModel');
const Wallet = require('../models/walletModel')


// **********Hash password**********
const securePassword = async(password) => {    
    try{
         const hashPassword = await bcrypt.hash(password, 10);
         return hashPassword;
    } catch (error) {
         console.log(error.message)
    }
}


// **********AdminLogin Page**********
const loadLogin = async(req,res) => {
    try{
        res.render('admin-login');

    }catch(error){
        console.log(error.messsage)
    }
}

// **********verify AdminLogin**********
const verifyLogin = async (req,res) =>{
  try{
    const email = req.body.email;
    const password = req.body.password;
    const emailRegext = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegext.test(email)){
        return res.render('admin-login',{message:"Please enter valid email"})
    }
    const userData = await User.findOne({email:email});
    if(userData){
         const passwordMatch = await bcrypt.compare(password,userData.password)
         if(passwordMatch){
            // console.log('check')
            if(userData.is_admin === 0){
                res.render('admin-login',{message:"Email and password is incorrect"})
            }else{
                req.session.admin_id = userData._id;
                req.session.admin = true;
                res.redirect('/admin/home');
            }
         }else{
            res.render('admin-login', {message:"Email and Password is in incorrect"})
         }
    }else{
        res.render('admin-login', {message:"Email and Password is in incorrect"})
    }
  }catch(error){
    console.log(error.message)
  }
}

const calculateTotalRevenue = async () => {
    try{

        const pipeline = [
           {
            $match:{
                orderStatus:'Delivered'
            }
           },
           {
            $group:{
                _id:null,
                totalRevenue:{$sum:'$billTotal'},
            }
           }
        ];

        const result = await Order.aggregate(pipeline);
        const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

        return totalRevenue
    }catch(error){
        console.log(error.message);
        throw error;
    }
}

const calculateTotalOrders = async() => {
   try{

    const pipeline = [
        {
            $group:{
                _id:null,
                totalOrders:{
                    $sum:1
                }
            }
        }
    ];

    const result = await Order.aggregate(pipeline);
    const totalOrders = result.length > 0 ? result[0].totalOrders : 0;
    return totalOrders;

   }catch(error){
       console.log(error.message);
       throw error;
   }
}


const calculateTotalProducts = async() => {
    try{

        const pipeline = [
            {
                $group:{
                    _id:null,
                    totalProducts:{
                        $sum:1
                    }
                }
            }
        ];
        const result = await Product.aggregate(pipeline);
        const totalProducts = result.length > 0 ? result[0].totalProducts : 0;

        return totalProducts;

    }catch(error){
        console.log(error.message);
        throw error;
    }
}

// **********Load Admin Dashboard**********
const loadHome = async(req,res) => {
    try{
        const userData = await User.findById({_id:req.session.admin_id})
        
        const totalRevenue = await calculateTotalRevenue();
        const totalOrders = await calculateTotalOrders();
        const totalProducts = await calculateTotalProducts();

        res.render('admin-home',{admin:userData,
        totalRevenue:totalRevenue,
        totalOrders:totalOrders,
        totalProducts:totalProducts
        })

    }catch(error){
        console.log(error.message)
    }
}

// **********LoadAdminProfile**********
const loadProfile = async(req,res) => {
    try{

        const adminProfile = await User.findById({_id:req.session.admin_id});
        res.render('admin-profile-page',{admin:adminProfile})

    }catch(error){
        console.log(error.message);
    }
}


// **********Logout**********

const logout = async(req,res) => {
    req.session.admin_id = "";
    req.session.admin = false;
    res.redirect('/admin');
}

//************* Forget Password ***********
const forgetLoad = async (req,res) => {
    try{
         res.render('admin-forget-password')
    }catch(error){
        console.log(error.message)
    }
}

//*********sendMail***************** */
const sendResetPassword = async(username, email, token) => {
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{
                user: config.config.email.user,
                pass: config.config.email.pass
            }
        });

        const mailOptions = {
            from: 'skirannaikz@gmail.com',
            to: email,
            subject: 'For reset password',
            html: '<p>Hii ' + username + ' Please click here to <a href="http://localhost:4000/admin/forget-password?token='+ token +'">reset your password</a></p>'
        }

        transporter.sendMail(mailOptions, (err) => {
            if(err){
                console.log(err.message);
            }else{
                console.log('Mail send Successfully');
            }
        })

    }catch(error){
        console.log(error.message)
    }
}

// **************SendingTokenWithRandomString**********
const forgetVerify = async(req,res) => {
    try{

        const email = req.body.email;
        const userData = await User.findOne({email:email});
        if(userData){
            
            if(userData.is_admin === 0){
                res.render('admin-forget-password',{message1:"Your account is not verified."})
            }else{
                const randomString = randomstring.generate()
                const updatedData = await User.updateOne({email:email},{$set:{token:randomString}});
                console.log(updatedData)
                sendResetPassword(userData.username,userData.email,randomString);
                res.render('admin-forget-password',{message:"Please check your mail to reset your password."})
            }
        }else{
            res.render('admin-forget-password',{message1:"Email dosen't exists"})
        }
    }catch(error){
      console.log(error.message)
    }
}

//************AdminResetPasswordPage************** */
const forgetPasswordLoad = async(req,res) => {
    try{

        const token = req.query.token;
        const tokenData = await User.findOne({token:token})
        if(tokenData){
            res.render('admin-reset-password',{user_id:tokenData._id})
        }else{
            res.render('admin-404-page',{message:"Token is invalid."});
        }

    }catch(error){
        console.log(error.message)
    }
}

// ***************UpdatingPassword***************
const resetPassword = async(req,res) => {
    try{
        const password = req.body.password;
        const userId = req.body.user_id;
    
        const secure_password = await securePassword(password);
        const updatedData = await User.findByIdAndUpdate({_id:userId},{$set:{password:secure_password}});
        console.log(updatedData);

        res.redirect('/admin')
    }catch(error){
        console.log(error.message)
    }
   
}

// ***************AdminDashboard***************
const loadAdminDashboard = async(req,res) => {
    try{
        const users = await User.find({is_admin:0})
        res.render('admin-dashboard',{users});

    }catch(error){
        console.log(error.message);
    }
}

//*********sendNewUserMail***************** */
const sendUserMail = async(firstname, username, email, password, user_id) => {
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{
                user: config.config.email.user,
                pass: config.config.email.pass
            }
        });

        const mailOptions = {
            from: 'skirannaikz@gmail.com',
            to: email,
            subject: 'You have completed your registration process by BOOKHUB admin',
            html: '<p>Hii ' + firstname + ' Please click here to <a href="http://localhost:4000/login?id='+ user_id +'">to verify </a>your mail</p> <br> <b>Username:</b>'+username+'<br> <b>Email:</b>'+email+'<br> <b>Password:</b>'+password+'<p>Please change your password</p>'
        }
        console.log(mailOptions);
        transporter.sendMail(mailOptions, (err) => {
            if(err){
                console.log(err.message);
            }else{
                console.log('Mail send Successfully');
            }
        })

    }catch(error){
        console.log(error.message)
    }
}

// ***************AddNewUserLoad***************
const newUserLoad = async(req,res) => {
    try{
        res.render('admin-new-user');

    }catch(error){
        console.log(error.message)
    }
} 

// ***************AddNewUser***************
const addNewUser = async(req,res) => {
    try{

        const firstname = req.body.firstname;
        const lastname = req.body.lastname;
        const username = req.body.username;
        const email = req.body.email;
        const mobile = req.body.mobile;
        const password = randomstring.generate(8);

        console.log('Form Data:', req.body);
        const spassword = await securePassword(password);
        const user = new User({
            firstname:firstname,
            lastname:lastname,
            username:username,
            email:email,
            mobile: mobile,
            password: spassword,
            is_verified:1,
            is_admin:0
        });

        const userData = await user.save();
        if(userData){
            sendUserMail(firstname,username,email,password,userData._id);
            res.redirect('/admin/dashboard');
        }else{
            res.render('admin-new-user',{message:'Something went wrong'})
        }
    }catch(error){
        console.log(error.message)
    }
};

// ***************EditUserDetails***************
const editUserLoad = async(req,res) => {
    try{
        const id = req.query.id;
        const userData = await User.findById({_id:id});
        if(userData){
            res.render('admin-edit-user',{user:userData})
        }else{
            res.redirect('/admin/dashboard');
        }

    }catch(error){
        console.log(error.message)
    }
}

// ***************updateUserDetails***************
const updateUserLoad = async (req, res) => {
    try {
        const userId = req.body.id;
        const isAdmin = req.session.is_admin;
    
        if (!isAdmin) {
            await User.findOneAndUpdate(
                { _id: userId, is_admin: 0 }, 
                {
                    $set: {
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        username: req.body.username,
                        email: req.body.email,
                        phone: req.body.phone,
                        is_verified: req.body.verify
                    }
                }
            );
            if (req.body.verify === '0') {
                if(!isAdmin){
                    req.session.user_id = "";
                    console.log(`Session destroyed for user with ID ${userId}`);
                }   
            }
        }
        
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}


// ***************deleteUserDetails***************
const deleteUserLoad = async(req,res) => {
    try{

        const id = req.query.id;
        await User.deleteOne({_id:id});
        res.redirect('/admin/dashboard');

    }catch(error){
        console.log(error.message)
    }
}

// ***************LoadOrderDetails***************
const   LoadOrderDetails = async(req,res) => {
    try{
        const currentPage = parseInt(req.query.page) || 1;
        const perPage = 5;
        const startIndex = (currentPage - 1) * perPage;

        const orderData = await Order.find({orderStatus:{$ne:'Deleted'}}).populate('user').skip(startIndex).limit(perPage).sort({orderDate:-1});
        const orderCount = await Order.countDocuments({orderStatus:{$ne:'Deleted'}}).populate('user');

        const totalPages = Math.ceil(orderCount/perPage)
        res.render('admin-list-order',{order:orderData,totalPages:totalPages,currentPage:currentPage})

    }catch(error){
        console.log(error.message)
    }
}

const ViewOrderDetails = async(req,res) => {
    try{
        const id = req.query.id;
        const orderData = await Order.findById({_id:id}).populate('user');
        const returnData = await Return.findOne({orderId:id});


        if(orderData){
            res.render('admin-order-details',{order:orderData,returnData: returnData})
        }else{
            res.redirect('/admin/order/lists')
        }
    }catch(error){
        console.log(error.message);
        const requestedRoute = req.url;
        res.render('admin-404-page',{message:`The following route '${requestedRoute}' is not available`});
        // res.status(500).json({ message: 'Internal server error' });
    }
}

const updateOrder = async (req, res) => {
    try {
        const orderId = req.body.orderId;
        const newStatus = req.body.status;

        console.log(orderId,newStatus);
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { orderStatus: newStatus }, { new: true });

        if(updatedOrder && newStatus === 'Delivered' && updatedOrder.paymentMethod === 'Cash On Delivery'){
            updatedOrder.paymentStatus = 'Success';
            await updatedOrder.save()
        }

        // console.log('updateOrder',updatedOrder.paymentStatus);
        if (updatedOrder) {
            res.redirect('/admin/order/detail?id=' + orderId);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
       
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateReturnOrder = async(req,res) => {
    try{
        const returnId = req.body.returnId;
        const newStatus = req.body.status;
        console.log(returnId,newStatus);

        const returnDocument = await Return.findById(returnId);
        const orderId = returnDocument.orderId;

        const updateReturnStatus = await Return.findByIdAndUpdate(returnId, {returnStatus: newStatus}, {new: true});
        
        if(updateReturnStatus && newStatus === 'Accepted' ){
            //to add quantity back to the stock
            await addReturnedProductToStock(orderId);

            //to add money back to the wallet 
            await addRefundedMoneyToWallet(returnDocument.user,returnDocument.orderId);

            const updatedOrder = await Order.findByIdAndUpdate(orderId,{paymentStatus:'Refunded'},{new:true})
        }

        if(updateReturnStatus){
            res.redirect('/admin/order/detail?id=' + orderId);
        }

    }catch(error){
        console.log(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const addReturnedProductToStock = async(orderId) => {
    try{

        const order = await Order.findById(orderId);

        for(const item of order.items){
            const productId = item.productId;
            const returnedQuantity = item.quantity || 0;

            const product =await Product.findByIdAndUpdate(productId,{$inc:{countInStock:returnedQuantity}},{new:true});
            if(product.countInStock > 0 && product.status === 'out-of-stock'){
                await Product.findOneAndUpdate(
                    {_id:productId,status:'out-of-stock'},
                    {$set:{status:'active'}},
                    {new:true}
                );
            }
            console.log('product',product)
        }

    }catch(error){
        console.log(error.message);
        throw error;
    }
}


const addRefundedMoneyToWallet = async(user,orderId) => {
    try{
        const order = await Order.findById(orderId);
        
        const refundedAmount = order.billTotal;

        await Wallet.findOneAndUpdate({user:user},{$inc:{walletBalance:refundedAmount}})

    }catch(error){
        console.log(error.message);
        throw error;
    }
}



const deleteOrderData = async(req,res) => {
    try{
        const {orderId} = req.body
        console.log(orderId);
        const deleteOrderData = await Order.findByIdAndUpdate(orderId, {orderStatus:'Deleted'}, {new:true});
        if (!deleteOrderData) {
            return res.status(404).json({ success: false, message: "Order not found" });
          }
          return res.status(200).json({ success: true, message: "Order successfully Deleted" });
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}


// *********************************************************************************************************************************************************************
//******************************loadCouponPage*********************************
const loadCouponPage = async(req,res) => {
    try{
        res.render('admin-add-coupon')

    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'});
    }
}
//*******************************GeneratingCouponCode**************************
function generatingCouponCode(){
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let couponCode = '';
    const codeLength = 8;

    for(let i=0;i<codeLength;i++){
        const randomIndex = Math.floor(Math.random() * characters.length);
        couponCode += characters[randomIndex];
    }
    return couponCode;
}
//*************************************AddCoupon*******************************
const addCouponData = async(req,res) => {
    const {name,startDate,endDate,minimumAmount,maximumAmount,discount} = req.body;
    console.log(req.body)
    try{

       const couponCode = generatingCouponCode();
       const newCoupon = new Coupon({
        name:name,
        startDate:startDate,
        endDate:endDate,
        minimumAmount:minimumAmount,
        maximumAmount:maximumAmount,
        discount:discount,
        couponCode,
        isActive:1
       });
       console.log('couponData',newCoupon);
       await newCoupon.save();
       
       return res.status(200).json({success:true,message:'Coupon added successfully'});

    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'})
    }
}

//*************************************View-Coupon-Lists*******************************
const viewCouponList = async(req,res) => {
    try{
        const CouponData = await Coupon.find({status:{$ne:'delete'}})
        return res.render('admin-view-coupon',{coupon:CouponData})

    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'})
    }
}

//*************************************Update-page*******************************
const loadUpdateCoupanPage = async(req,res) => {
    try{
        const couponId = req.query.id;
        const couponData = await Coupon.findById(couponId)
        if(couponData){
            return res.render('admin-edit-coupon',{coupon:couponData})
        }
    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'});
    }
}

//******************************Update-coupon-data*******************************
const updateCouponDetails = async(req,res) => {
    try{  
        const couponId = req.body.coupon_id;
        const updateDetails = {
            name:req.body.name,
            minimumAmount:req.body.minimumAmount,
            maximumAmount:req.body.maximumAmount,
            discount:req.body.discount,
            isActive:req.body.verify
        }

        if (req.body.startDate) {
            updateDetails.startDate = req.body.startDate;
        }

        if (req.body.endDate) {
            updateDetails.endDate = req.body.endDate;
        }

        const updateCoupon = await Coupon.findByIdAndUpdate(couponId,updateDetails,{new:true});
        if(!updateCoupon){
            return res.render('admin-edit-coupon',{errorMessage:'Failed to update coupon data',coupon:updateCoupon})
        }
         
        return res.redirect('/admin/view/coupons')

    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'});
    }
}


//****************************Delete-Coupon*********************************
const removeCoupon = async(req,res) => {
    try{
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(
            couponId,
            {$set:{
                status:'delete'
            }
        },
            {new:true}
        )
        res.redirect('/admin/view/coupons');

    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'});
    }
}
//*****************************************************************************************************************************************************************
//****************************SALES_REPORT*********************************
const loadSalesReport = async(req,res) => {
    try{
        const currentPage = parseInt(req.query.page) || 1;
        const perPage = 6;
        const startIndex = (currentPage - 1) * perPage;
        const orderData = await Order.find({orderStatus:'Delivered'}).populate('items.productId user')
        .skip(startIndex).limit(perPage).sort({orderDate:-1})
        const orderCouont = await Order.countDocuments({orderStatus:'Delivered'}).populate('items.productId user');

        const totalPage = Math.ceil(orderCouont/perPage)
        res.render('admin-sales-report',{order:orderData,totalPage:totalPage,currentPage:currentPage})

    }catch(error){
        console.log(error.message);
        res.status(500).json({success:false,message:'Internal server error'});
    }
}

const filterSalesReport = async (req, res) => {
    try {
        const { interval, startDate, endDate } = req.query;

        // console.log('req-body', req.query);

        const currentDate = new Date();
        let startDateQuery = new Date();
        let endDateQuery = new Date();

        if (interval === 'custom' || (startDate && endDate)) {
            startDateQuery = new Date(startDate);
            endDateQuery = new Date(endDate);
        } else {
            switch (interval) {
                case 'daily':
                    startDateQuery.setHours(0, 0, 0, 0);
                    endDateQuery.setDate(endDateQuery.getDate() + 1); // Set to beginning of the next day
                    break;
                case 'weekly':
                    startDateQuery.setDate(startDateQuery.getDate() - 7); // Set to 7 days ago
                    startDateQuery.setHours(0, 0, 0, 0);
                    endDateQuery.setHours(23, 59, 59, 999); // Set to end of the day
                    break;
                case 'monthly':
                    startDateQuery = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    startDateQuery.setHours(0, 0, 0, 0);
                    endDateQuery.setHours(23, 59, 59, 999);
                    break;
                case 'yearly':
                    startDateQuery = new Date(currentDate.getFullYear(), 0, 1);
                    startDateQuery.setHours(0, 0, 0, 0);
                    endDateQuery.setHours(23, 59, 59, 999);
                    break;
                default:
                    console.log('your at the default case');
                    break;
                    // return res.status(400).json({ success: false, message: 'Invalid interval specified' });
            }
        }

        // console.log('startDateQuery:', startDateQuery);
        // console.log('endDateQuery:', endDateQuery);

        // querying based on orderDate:
        const filteredOrders = await Order.find({ orderDate: { $gte: startDateQuery, $lte: endDateQuery } }).populate('items.productId user').sort({orderDate:-1});
        console.log('filteredOrders', filteredOrders)

        res.json(filteredOrders);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false })
    }
}

const filterTotalRevenue = async (req,res) => {
    try{

        const {interval} = req.query;
        let startDate;
        let endDate;

       switch(interval){
         case 'daily':
            startDate = new Date();
            startDate.setHours(0,0,0,0);
            endDate = new Date();
            endDate.setHours(23,59,59,999);
            break;
        case 'weekly':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0,0,0,0)
            endDate = new Date();
            endDate.setHours(23,59,59,999);
            break;
        case 'monthly':
            startDate = new Date();
            startDate.setDate(1); 
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); 
            endDate.setDate(0); 
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'yearly':
            startDate = new Date();
            startDate.setMonth(0); // Set to the beginning of the current year
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1); // Set to the beginning of the next year
            endDate.setMonth(0);
            endDate.setDate(0); // Set to the last day of the last month of the current year
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            throw new Error('Invalid interval');
       }

       const pipeline = [
            {
                $match:{
                    orderDate:{
                        $gte:startDate,
                        $lte:endDate
                    },
                    orderStatus:'Delivered'
                }
            },
            {
                $group:{
                    _id:null,
                    totalSalesRevenue:{$sum:'$billTotal'}
                }
            }
       ];

       const result = await Order.aggregate(pipeline);
       const totalSalesRevenue = result.length > 0 ? result[0].totalSalesRevenue : 0;
       res.json(totalSalesRevenue)

    }catch(error){
        console.log(error.message);
        res.status(500).json({success:false,message:'Internal server error'});
    }
}




module.exports = {
    loadLogin,
    verifyLogin,
    loadHome,
    logout,
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword,
    loadProfile,
    loadAdminDashboard,
    newUserLoad,
    addNewUser,
    editUserLoad,
    updateUserLoad,
    deleteUserLoad,
    LoadOrderDetails,
    ViewOrderDetails,
    updateOrder,
    deleteOrderData,
    updateReturnOrder,
    loadCouponPage,
    addCouponData,
    viewCouponList,
    loadUpdateCoupanPage,
    updateCouponDetails,
    removeCoupon,
    loadSalesReport,
    filterSalesReport,
    filterTotalRevenue
}