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
const Review = require('../models/reviewModel');
const Wishlist = require('../models/wishlistModel');
const Wallet = require('../models/walletModel');


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

//***************Generate Refferal Code:***************
function generatingRefferalCode(){
    const characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
    let refferalCode = '';
    const codeLength = 8;

    for(let i = 0;i<codeLength;i++){
        const randomIndex = Math.floor(Math.random() * characters.length);
        refferalCode += characters[randomIndex];
    }
    return refferalCode;
}


const insertUser = async (req, res) => {
    try {
        // Trimming white space for all string fields
        for (const key in req.body) {

           if(key === 'referedBy'){
              continue;
           }

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

        if(req.body.referedBy){
            const referrer = await User.findOne({refCode:req.body.referedBy})
            if (!referrer) {
                console.log('Invalid referral code');
                return res.render('user-register',{invalidReferralCodeMessage:'Invalid Referral Code'})
            }
        }

        const [existingUsername, existingEmail, existingPhone] = await Promise.all([
            User.findOne({ username: req.body.username }),
            User.findOne({ email: req.body.email }),
            User.findOne({ mobile: req.body.mobile })
        ]);

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
        // If all validations pass, generate OTP and redirect to OTP verification page
        if (req.body.password === req.body.confirm_password) {
            res.redirect('/verify-otp');
        }

        const refCode = generatingRefferalCode()
        const otp = generateOTP();
        const { firstname, lastname, username, email, mobile,referedBy, password, confirm_password } = req.body;
        const data = {
            firstname,
            lastname,
            username,
            email,
            mobile,
            refCode,
            referedBy,
            password,
            confirm_password,
            otp
        };
        req.session.Data = data;
        req.session.save();
        console.log(otp, 'this is otp');

        const mailOptions = {
            from: 'skirannaikz@gmail.com',
            to: req.body.email,
            subject: 'Your OTP for verification',
            text: `You OTP ${otp}`
        }
        if (mailOptions) {
            transporter.sendMail(mailOptions, (err) => {
                if (err) {
                    console.log(err.message);
                } else {
                    console.log('Mail send Successfully');
                }
            });
        }
    } catch (error) {
        console.error('Error in insertUser:', error);
        req.flash('errorMessage', 'Something went wrong. Try again later');
        return res.redirect('register');
    }
};

//**************To send otp mail************** */
const sendOTP = (email, otp) => {
    const mailOptions ={
        from: 'skirannaikz@gmail.com',
        to: email,
        subject: 'Your OTP for verification',
        text: `Your OTP: ${otp}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if(err) {
            console.error(err.message);
        } else {
            console.log('Mail sent successfully');
        }
    });
};

//**************FunctionToGenerateOTP and send mail************** 
const generateAndSendOTP = (email) => {
    const otp = generateOTP();
    sendOTP(email, otp);
    return otp;
};

//**************Resend OTP************** */
const resendOTP = async(req,res) => {
    try{
       const data = req.session.Data;
       const otp = generateAndSendOTP(data.email);
       console.log('newOTP',otp);
       req.session.Data.otp = otp;
       req.session.save();
       res.json({ success: true, message: 'OTP resend successfully' });
    }catch(error){
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
    
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
            refCode:req.session.Data.refCode,
            referedBy:req.session.Data.referedBy,
            password: sPassword,
            is_admin: 0,
            is_verified: 1
        });
            await user.save();

            const wallet = new Wallet({
                user: user._id,
                walletBalance:100
            })

            await wallet.save();

            //updating the wallet for the reffering user:
            if(req.session.Data.referedBy){
                const referrer = await User.findOne({refCode: req.session.Data.referedBy});
                if(referrer){
                    const referrerWallet = await Wallet.findOneAndUpdate(
                        {user:referrer._id},
                        {$inc:{walletBalance: 100}},
                        {new:true, upsert:true}
                    )
                    console.log('referred User',referrerWallet)
                }
            }
            
            
            return res.redirect('home')
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
                if(userData.is_verified == 0){
                    res.render('user-login-page',{message1:"Your account is not verified."})
                }else{
                    req.session.user_id = userData._id;
                    req.session.user = true;
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

//************* Logut **************
const userLogout = (req,res) => {
        req.session.user_id = null;
        req.session.user = false;
        res.redirect('/');
}
 
module.exports = {
    loadLandindPage,
    loadRegister,
    insertUser,
    resendOTP,
    loadOtp,
    verifyOTP,
    loadLoginPage,
    verifyLogin,
    userLogout,    
};
