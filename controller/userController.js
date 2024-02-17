const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const generateOTP = require('./otpGenerator').generateOTP;
const nodemailer = require('nodemailer');
const session = require('express-session');
const randomstring = require('randomstring');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: config.config.email.user,
        pass: config.config.email.pass
    }
})


// *************hashPassword*****************
const securePassword = async (password) => {
    try {
        const hashPassword = await bcrypt.hash(password, 10);
        return hashPassword;
    } catch (error) {
        console.log(error.message);
        throw error;
    }
}

//*************** */ Load Landing Page***************
const loadLandindPage = async (req,res) => {
    try{
        res.render('index')

    }catch(error){
        console.log(error.message)
    }
}

//*************** */ 1 LoadRegister***************
const loadRegister = async (req, res) => {
    try {
        res.render('user-register', {
            successMessage: req.flash('successMessage')[0],
            errorMessage: req.flash('errorMessage')[0]
        });
    } catch (error) {
        console.log(error.message);
    }
};

//************** */ 1.2 - InsertUser *******************
const insertUser = async (req, res) => {
    try {
        // Trimming white space for all string fields
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key) && typeof req.body[key] === 'string') {
                const trimmedValue = req.body[key].trim();

                // checking trimmed value is empty
                if (!trimmedValue) {
                    req.flash('errorMessage', `${key} cannot be empty`);
                    return res.redirect('register');
                }

                // validation for valid characters
                if (key === 'firstname' || key === 'lastname') {
                    const validCharactersRegex = /^[a-zA-Z\s]+$/;
                    if (!validCharactersRegex.test(trimmedValue)) {
                        req.flash('errorMessage', `${key} contains invalid characters`);
                        return res.redirect('register');
                    }
                }

                req.body[key] = trimmedValue;
            } else {
                req.flash('errorMessage', `${key} contains invalid characters`);
                return res.redirect('register');
            }
        }
        // checkbox
        if (!req.body.checkbox || req.body.checkbox !== 'agree') {
            req.flash('errorMessage', 'Please accept terms and conditions');
            return res.redirect('register');
        }
        // username validation
        const userName = req.body.username;
        const userNameLength = /^.{3,}$/;
        if (!userNameLength.test(userName)) {
            req.flash('errorMessage', 'Username must have at least 3 characters');
            return res.redirect('register');
        }
        // password validation
        const passwordInput = req.body.password;
        const checkPassword = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z0-9!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!checkPassword.test(passwordInput)) {
            req.flash('errorMessage', 'Please add a valid password');
            return res.redirect('register');
        }
        const confirmPassword = req.body.confirm_password;
        if (passwordInput !== confirmPassword) {
            req.flash('errorMessage', 'Passwords do not match');
            return res.redirect('register');
        }
        // validation for email, mobileNumber, and uniqueness...
        const emailInput = req.body.email;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput)) {
            req.flash('errorMessage', 'Invalid Email address');
            return res.redirect('register');
        }
        const mobileNumber = req.body.mobile;
        const mobileRegex = /^\d{10}$/;
        const hasConsecutiveZeros = /0000000000/.test(mobileNumber);
        if (!mobileRegex.test(mobileNumber) || hasConsecutiveZeros) {
            req.flash('errorMessage', 'Invalid Mobile Number');
            return res.redirect('register');
        }
        const existingUsername = await User.findOne({ username: req.body.username });
        const existingEmail = await User.findOne({ email: req.body.email });
        const existingPhone = await User.findOne({ mobile: req.body.mobile });
        if (existingUsername) {
            req.flash('errorMessage', 'Username already taken!');
            return res.redirect('register');
        } else if (existingEmail) {
            req.flash('errorMessage', 'Email already taken!');
            return res.redirect('register');
        } else if (existingPhone) {
            req.flash('error', 'Phone number already exists!');
            return res.redirect('register');
        }
        if(req.body.password==req.body.confirm_password){
            res.redirect('/verify-otp')
        }
         const otp = generateOTP();
         const {firstname,lastname,username,email,mobile,password,confirm_password} = req.body
         const data = {
            firstname,
            lastname,
            username,
            email,
            mobile,
            password,
            confirm_password,
            otp
         }
         req.session.Data = data
         req.session.save()
         console.log(otp,'this is otp');
         const mailOptions ={
              from: 'skirannaikz@gmail.com',
              to: req.body.email,
              subject: 'Your OTP for verification',
              text: `You OTP ${otp}`
         }
         if(mailOptions){
            transporter.sendMail(mailOptions, (err) => {
                if(err){
                    console.log(err.message);
                }else{
                    console.log('Mail send Successfully')
                }
            })
         }       
    } catch (error) {
        console.error('Error in insertUser:', error);
        req.flash('errorMessage', 'Something went wrong. Try again later');
        return res.redirect('register');
    }
};


//**************Load otpPage************** */

const loadOtp = async(req,res) => {
    console.log(req.session.Data+"from here");
    try{
        res.render('user-otp');
    }catch(error){
        console.log(error.message)
    }
}

//****************Verify OTP************** 

const verifyOTP = async (req, res) => {
    try {       
        const otpReceived = await req.body.otp;
        if(otpReceived === req.session.Data.otp){
            const sPassword = await securePassword(req.session.Data.password);
            const user = new User({
            firstname: req.session.Data.firstname,
            lastname: req.session.Data.lastname,
            username: req.session.Data.username,
            email: req.session.Data.email,
            mobile: req.session.Data.mobile,
            password: sPassword,
            is_admin: 0,
            is_verified: 1
        });
            await user.save();
            req.flash('successMessage','Registered Successfully');
            return res.redirect('/login')
        }else {
            return res.render('user-otp',{errorMessage:'Invalid OTP'});           
        }
    } catch (error) {
        console.log(error.message);
        req.flash('errorMessage', 'Something went wrong. Try again later');
        return res.redirect('register');
    }
};


//****************LoginPage Load**************
const loadLoginPage = async(req,res) => {
    try{
        res.render('user-login-page', {
            successMessage: req.flash('successMessage')[0],
            errorMessage: req.flash('errorMessage')[0]
        });
    }catch(error){
        console.log(error.message)
    }
}

//************* Verify LoginPage**************
const verifyLogin = async (req, res) => {
    try {
        const {username,password} = req.body;
        const userData = await User.findOne({ username: username });
        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                if(userData.is_verified === 0){
                    res.render('user-login-page',{message1:"Your account is not verified."})
                }else{
                    req.session.user_id = userData._id;
                    res.redirect('/home');
                }
            }else{
                res.render('user-login-page',{message1:"*Invalid Username and password"});
            }
            
        }else{
           res.render('user-login-page',{message1:"*Invalid username and password"});
        }

         } catch (error) {
        console.log(error.message)
    }
};

//************* LoadHome Page**************
const loadHomePage = async(req,res) => {
    try{
       const  userData = await User.findById({_id:req.session.user_id})
       const productData=await Product.find({is_published:1})
       res.render('home',{user:userData,product:productData})
    }catch(error){
        console.log(error.message)
    }
}

//************* LoadProfile Page**************
const loadProfilePage = async(req,res) => {
    try{
        const userData = await User.findById({_id:req.session.user_id})
        const categoryData = await Category.find({status:'active'})
        res.render('user-profile',{user:userData,category:categoryData})
    }catch(error){
        console.log(error.message)
    }
}

//************* insertAddress Page**************
const insertAddress = async(req,res) => {
    try{
        
        const {street,city,state,country,postalCode} = req.body;
        const userId = await User.findById({_id:req.session.user_id});
        const categoryData = await Category.find({status:'active'});
        const address = {
            street,
            city,
            state,
            country,
            postalCode,
            type:req.body.type || 'home'
        }

        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        if(userId.address.length >=3){
            res.render('user-profile',{errorMessage:"You can't set more than three address.",user:userId,category:categoryData})
        }else{
            userId.address.push(address);
            await userId.save();
            res.render('user-profile', { successMessage: 'Address added successfully', user: userId, category: categoryData });
        }

    }catch(error){
        console.log(error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//************* LoadEditor Page**************
const loadEditUser = async(req,res) => {
    try{
        const id = req.query.id;
        const userData = await User.findById({_id:id})
        const categoryData = await Category.find({status:'active'})
        if(userData){
            res.render('user-edit-page',{user:userData,category:categoryData});
        }else{
            res.redirect('/profile')
        }
    }catch(error){
        console.log(error.message)
        res.status(500).json({ error: 'Internal server error' });
    }
}

//************* UpdateUserDetails**************
const userUpdateLoad = async(req,res) => {
    try{
        await User.findByIdAndUpdate({_id:req.body.id},{$set:{firstname:req.body.firstname,lastname:req.body.lastname,username:req.body.username,mobile:req.body.mobile}});
        res.redirect('/profile');
    }catch(error){
        console.log(error.message)
    }
}

//************* LoadAddressUpdatePage**************
const loadupdateUserAddress = async(req,res) => {
    try{
        const id = req.query.id;
        const addressId = req.query.addressId;
        const userData = await User.findById({_id:id})
        if(userData){
            const address = userData.address.find(address => address._id == addressId);
            if(address){
                res.render('user-edit-address',{user:userData, address: address});
            }else{
                res.redirect('/profile');
            }           
        }else{
            res.redirect('/profile')
        }
    }catch(error){
        console.log(error.message)
    }
}

//************* LoadAddressUpdatePage**************
const updateUserAddress = async (req, res) => {
    try {
        const userId = req.body.userId; 
        const addressId = req.body.addressId;
        const newData = {
            'address.$.street': req.body.street,
            'address.$.city': req.body.city,
            'address.$.state': req.body.state,
            'address.$.country': req.body.country,
            'address.$.postalCode': req.body.postalCode,
            'address.$.type': req.body.type
        };
        await User.updateOne({ _id: userId, 'address._id': addressId }, { $set: newData }, { new: true });
        res.redirect('/profile')
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//************* DeleteUserAddress ***********
const deleteUserAddress = async(req,res) => {
    try{
        const userId = req.query.id;
        const addressId = req.query.addressId;
        await User.updateOne({_id:userId},{$pull:{address:{_id:addressId}}});
        res.redirect('/profile')
    }catch(error){
        console.log(error.message);
        res.status(500).json({error:'Internal server error'});
    }
}

//************* Forget Password ***********
const forgetLoad = async(req,res) => {
    try{
        res.render('forget-pass')

    }catch(error){
        console.log(error.message)
    }
}


const sendResetPassword = async(username, email, token) => {
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{
                user: config.config.email.user,
                pass: config.config.email.pass
            }
        });
        const mailOptions ={
            from: 'skirannaikz@gmail.com',
            to: email,
            subject: 'For resert password',
            html: '<p>Hii ' + username + ' Please click here to <a href="http://localhost:4000/forget-password?token='+ token +'">reset your password</a></p>'
       }
       transporter.sendMail(mailOptions, (err) => {
        if(err){
            console.log(err.message);
        }else{
            console.log('Mail send Successfully')
        }
    });
    }catch(error){
        console.log(error.message)
    }
}


//************* Forget Verify ***********
const forgetVerify = async(req,res) => {
    try{

        const email = req.body.email;
        const userData = await User.findOne({email:email});
        if(userData){           
            if(userData.is_verified === 0){
                res.render('forget-pass',{message1:"Your account is not verified."})
            }else{
                const randomString = randomstring.generate()
                const updatedData = await User.updateOne({email:email},{$set:{token:randomString}});
                console.log(updatedData)
                sendResetPassword(userData.username,userData.email,randomString);
                res.render('forget-pass',{message:"Please check your mail to reset your password."})
            }
        }else{
            res.render('forget-pass',{message1:"Email dosen't exists"})
        }
    }catch(error){
      console.log(error.message)
    }
}

const forgetPasswordLoad = async(req,res) => {
    try{
        const token = req.query.token;
        const tokenData = await User.findOne({token:token});
        if(tokenData){
            res.render('forget-password',{user_id:tokenData._id})
        }else{
            res.render('page-404',{message:"Token is invalid."});
        }
    }catch(error){
        console.log(error.message)
    }
}

const resetPassword = async(req,res) => {
    try{
        const password = req.body.password;
        const user_id = req.body.user_id;
        const secure_password = await securePassword(password);
        const updatedData = await User.findByIdAndUpdate({_id:user_id},{$set:{password:secure_password}})
        console.log(updatedData);
        res.redirect('/login');
    }catch(error){

    }
}

// ***************LoadProduct***************
const loadProduct = async(req,res) => {
    try{
        const  userData = await User.findById({_id:req.session.user_id})
        const productData=await Product.find({is_published:1})
        const categoryData = await Category.find({status:'active'})
        res.render('user-product-list',{user:userData,
        product:productData, category: categoryData})
    }catch(error){
        console.log(error.message)
    }
}

// ***************LoadIndividualProduct***************
const LoadIndIvidualProduct = async (req,res) => {
    try{
        const id = req.query.id;
        const userData = await User.findById({_id:req.session.user_id})
        const productData = await Product.findById({_id:id})
        const categoryData = await Category.find({status:'active'})
        if(productData){
            res.render('user-product-view',{product:productData
            ,user:userData
            ,category:categoryData
        })
        c
        }else{
            res.redirect('//product-list')
        }
    }catch(error){
        console.log(error);
    }
}

 
//************* Logut **************
const userLogout = async(req,res) => {
    try{
        req.session.destroy();
        res.redirect('/');
    }catch(error){
        console.log(error.message);
        
    }
}





module.exports = {
    loadLandindPage,
    loadRegister,
    insertUser,
    loadOtp,
    verifyOTP,
    loadLoginPage,
    verifyLogin,
    loadHomePage,
    loadProfilePage,
    loadEditUser,
    userUpdateLoad,
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword,
    userLogout,
    loadProduct,
    LoadIndIvidualProduct,
    insertAddress,
    loadupdateUserAddress,
    updateUserAddress,
    deleteUserAddress,
    // addToCart
};
