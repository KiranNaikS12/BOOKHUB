const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');


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


//************* Forget Password ***********
const forgetLoad = async(req,res) => {
    try{
        res.render('forget-pass')

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

module.exports = {
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword
}