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
const Wishlist = require('../models/wishlistModel')


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

        const otp = generateOTP();
        const { firstname, lastname, username, email, mobile, password, confirm_password } = req.body;
        const data = {
            firstname,
            lastname,
            username,
            email,
            mobile,
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

//************* LoadHome Page**************
const loadHomePage = async(req,res) => {
    try{
       const categoryData = await Category.find({status:'active'})
       const  userData = await User.findById({_id:req.session.user_id})
       const productData=await Product.find({is_published:1});
       const cartData = await Cart.findOne({owner:userData}).populate('items.productId');
        if(cartData) {
            cartData.items = await Promise.all(cartData.items.map(async (item) => {
                const product = await Product.findById(item.productId);
                if (product && (product.status === 'active' || product.status === 'out-of-stock')) {
                    return { ...item, data: product };
                }
            }));
            cartData.items = cartData.items.filter(item => item !== null && item !== undefined);
        }
        let cartItemCount = 0;
        if(cartData && cartData.items){
            cartItemCount = cartData.items.length;
        }
        let wishlistCount = 0;
        const wishlist = await Wishlist.findOne({ user: userData });
        if (wishlist && wishlist.items) {
            wishlistCount = wishlist.items.length;
        }

       res.render('home',{user:userData,product:productData,cartItemCount:cartItemCount,cart:cartData,category:categoryData,wishlistCount:wishlistCount})
    }catch(error){
        console.log(error.message)
    }
}

//************* LoadProfile Page**************
const loadProfilePage = async(req,res) => {
    try{
        const userData = await User.findById({_id:req.session.user_id})
        const categoryData = await Category.find({status:'active'})
        const cart = await Cart.findOne({owner:userData});
        const cartItemCount = cart ? cart.items.length : 0;
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        res.render('user-profile',{user:userData,category:categoryData, cartItemCount: cartItemCount,wishlistCount:wishlistCount})
    }catch(error){
        console.log(error.message)
    }
}

//************* insertAddress Page**************
const insertAddress = async(req,res) => {
    try{
        
        const {street,city,state,country,postalCode} = req.body;
        const userData = await User.findById({_id:req.session.user_id});
        const categoryData = await Category.find({status:'active'});
        const cart = await Cart.findOne({owner:userData})
        const cartItemCount = cart ? cart.items.length : 0;
        const address = {
            street,
            city,
            state,
            country,
            postalCode,
            type:req.body.type || 'home'
        }

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        if(userData.address.length >=3){
            res.render('user-profile',{errorMessage:"You can't set more than three address.",user:userData,category:categoryData,cartItemCount:cartItemCount})
        }else{
            userData.address.push(address);
            await userData.save();
            res.render('user-profile', { successMessage: 'Address added successfully', user: userData, category: categoryData,cartItemCount:cartItemCount });
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
        const cart = await Cart.findOne({owner:userData})
        const cartItemCount = cart ? cart.items.length : 0;
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        if(userData){
            res.render('user-edit-page',{user:userData,category:categoryData,cartItemCount:cartItemCount,wishlistCount:wishlistCount});
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
        const userData = await User.findById({_id:id});
        const cart = await Cart.findOne({owner:userData})
        const cartItemCount = cart ? cart.items.length : 0;
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        if(userData){
            const address = userData.address.find(address => address._id == addressId);
            if(address){
                res.render('user-edit-address',{user:userData, address: address,cartItemCount:cartItemCount,wishlistCount:wishlistCount});
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
        const page = parseInt(req.query.page) || 1; //getting current page from the query parameter by setting default to 1;
        const perPage= 9;
        const startIndex = (page - 1) * perPage;
        const  userData = await User.findById({_id:req.session.user_id})
        const productData=await Product.find({is_published:1,status:{$ne:'inactive'}}).skip(startIndex).limit(perPage);
        
        
        const productCount = await Product.countDocuments({ is_published: 1, status: { $ne: 'inactive' } }); // Total number of products
        const totalPages = Math.ceil(productCount / perPage); //calculating total number of pages

        const categoryData = await Category.find({status:'active'})
        const cartData = await Cart.findOne({owner:userData}).populate('items.productId');
        if(cartData) {
            cartData.items = await Promise.all(cartData.items.map(async (item) => {
                const product = await Product.findById(item.productId);
                if (product && (product.status === 'active' || product.status === 'out-of-stock')) {
                    return { ...item, data: product };
                }
            }));
            cartData.items = cartData.items.filter(item => item !== null && item !== undefined);
        }


        const productWithStatus = productData.map(productItem => {
            let productStat = 'active';

            if(cartData && cartData.items){
                const cartItem = cartData.items.find(item => item.productId.equals(productItem._id));
                productStat = cartItem ? cartItem.productStatus: 'active';
            }
            return {
                _id:productItem._id,
                images:productItem.images,
                category:productItem.category,
                title:productItem.title,
                afterDiscount:productItem.afterDiscount,
                price: productItem.price,
                status:productItem.status,
                productStatus: productStat
            };
        })
        let cartItemCount = 0;
        if (cartData && cartData.items) {
            cartItemCount = cartData.items.length;
        }
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        res.render('user-product-list',{user:userData,                  
        product:productWithStatus,
        category: categoryData,
        cartItemCount:cartItemCount,
        totalPages: totalPages,
        currentPage: page,
        wishlistCount:wishlistCount
    })
    }catch(error){
        console.log(error.message)
    }
}

// ***************LoadIndividualProduct***************
const LoadIndIvidualProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById(req.session.user_id);
        const productData = await Product.findById(id);
        const categoryData = await Category.find({ status: 'active' });
        const reviewData = await Review.find({productId:id}).populate({path:'userId',select:'firstname'})

        const cartData = await Cart.findOne({owner:userData}).populate('items.productId');
        if(cartData) {
            cartData.items = await Promise.all(cartData.items.map(async (item) => {
                const product = await Product.findById(item.productId);
                if (product && (product.status === 'active' || product.status === 'out-of-stock')) {
                    return { ...item, data: product };
                }
            }));
            cartData.items = cartData.items.filter(item => item !== null && item !== undefined);
        }
        let cartItemCount = 0;
        if (cartData && cartData.items) {
            cartItemCount = cartData.items.length;
        }

        if (productData) {
            productData.views++;
            await productData.save();

            // Find related products with the same category
            const relatedCategory = await Product.find({category:productData.category,_id:{$ne:productData._id}}).limit(4);
            const wishlist = await Wishlist.findOne({ user: userData });
            const wishlistCount = wishlist ? wishlist.items.length : 0;
            res.render('user-product-view', {
                product: productData,
                user: userData,
                category: categoryData,
                cartItemCount: cartItemCount,
                relatedCategory:relatedCategory,
                review:reviewData,
                wishlistCount:wishlistCount
            });
        } else {
            res.redirect('/product-list');
        }
    } catch (error) {
        console.log(error);
    }
}

 
//************* Logut **************
const userLogout = (req,res) => {
        req.session.user_id = null;
        req.session.user = false;
        res.redirect('/');
}

const getPopularProducts = async(req,res) => {
    try{

        const popularProducts = await Product.find().sort({ views: -1 }).limit(10);
        res.json(popularProducts);

    }catch(error){
        console.log('Error fetching popular products:', error);
        res.status(500).json({ message: 'Internal server error' }); 
    }
}

const getAllProducts = async(req,res) => {
    try{
        const getAllProudcts = await Product.find();
        res.json(getAllProudcts)
    }catch(error){
        console.log(error.message);
        res.status(500).json({ message: 'Internal server error' }); 
    }
}

const loadCategoryPage = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 6;
        const startIndex = (page - 1) * perPage;
        const categoryName = req.query.category;
        const userData = await User.findById(req.session.user_id);
        const categoryData = await Category.find({ status: 'active' });
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).send('Category not found');
        }
        
        const products = await Product.find({ category: categoryName,status:{$ne:'inactive'} }).skip(startIndex).limit(perPage);
        const cartData = await Cart.findOne({ owner: userData }).populate('items.productId');
        let cartItemCount = 0;
        if (cartData && cartData.items) {
            cartItemCount = cartData.items.length;
        }
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        res.render('user-category', {
            product: products,
            user: userData,
            cartItemCount: cartItemCount,
            category: categoryData,
            categoryname: categoryName,
            currentPage: page,
            wishlistCount:wishlistCount,
            totalPages: Math.ceil(await Product.countDocuments({ category: categoryName, status: { $ne: 'inactive' } })/perPage)
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const filterProducts = async (req, res) => {
    try {
        const categoryName = req.query.category;
        const sortBy = req.query.sortBy;
        let productData;

        let baseQuery = { status: { $ne: 'inactive' } };

        if (categoryName) {
            baseQuery.category = categoryName;
        }

        if (sortBy === 'lowToHigh') {
            productData = await Product.find(baseQuery).sort({ afterDiscount: 1 });
        } else if (sortBy === 'highToLow') {
            productData = await Product.find(baseQuery).sort({ afterDiscount: -1 });
        } else if (sortBy === 'averageRating') {
            productData = await Product.aggregate([
                { $match: baseQuery },
                {
                    $lookup: {
                        from: 'reviews',
                        localField: '_id',
                        foreignField: 'productId',
                        as: 'ratings'
                    }
                },
                {
                    $addFields: {
                        averageRating: { $avg: '$ratings.rating' }
                    }
                },
                { $sort: { averageRating: -1 } }
            ]);
            
        } else {
            productData = await Product.find(baseQuery);
        }

        res.json(productData);
    } catch (error) {
        console.log('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

   
const filterPopularity = async(req,res) => {
    try{
        console.log('start')
        const categoryName = req.query.category;
        const showBy = req.query.showBy;
        let productPopularity;
        console.log('started')
        const baseQuery = { category: categoryName, status: { $ne: 'inactive' } };
        if (showBy === 'Trending'){
            productPopularity = await Product.find(baseQuery).sort({views:-1});
            // console.log('trending',productPopularity)
        }else if(showBy === 'NewArrivals'){
            productPopularity = await Product.find(baseQuery).sort({ updated_at: 1 })
        }else if(showBy === 'AZ'){
            productPopularity = await Product.find(baseQuery).sort({ title: 1 });
        }else if(showBy === 'ZA'){
            productPopularity = await Product.find(baseQuery).sort({title:-1});

        }else{
            productPopularity = await Product.find(baseQuery);
        }

        res.json(productPopularity);

    }catch(error){
        console.log('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const sendReview = async(req,res) => {
    try{
        const {productId, rating, reviewText} = req.body;
        console.log(req.body);
        const userId = req.session.user_id; 

        
        if (!productId || !rating || !reviewText) {
            return res.status(400).json({ message: 'Missing required fields' });
        }       
        
        const newReview = new Review({
            productId:productId,
            userId:userId,
            rating:rating,
            reviewText:reviewText
        });
        await newReview.save();
        res.status(200).json({ success: true, message: 'Review submitted successfully' });
    }catch(error){
        console.log(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const searchProduct = async(req,res) => {
    try{
        const query = req.query.query;
        const result = await Product.find({ title: { $regex: query, $options: 'i' } })
        console.log(result)
        res.json(result);
    }catch(error){
        console.error('Error searching for books:', error);
        res.status(500).json({ error: 'An error occurred while searching for books' });
    }
}

const loadDistinctCategory = async(req,res) => {
    try{
        const categoryName = req.query.category;
        const products = await Product.find({category:categoryName})
        res.json(products);
    }catch(error){
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
}

const loadProductFilter = async (req, res) => {
    try {
        const sortBy = req.query.sortBy;
        const maxPrice = req.query.maxPrice;
        const minPrice = req.query.minPrice;

        let query = {}

        if(minPrice && maxPrice){
            query.afterDiscount = {$gte: parseInt(minPrice), $lte: parseInt(maxPrice)};
        }

        let sortCriteria = {};
        if (sortBy === 'lowToHigh') {
            sortCriteria = { price: 1 }; 
        } else if (sortBy === 'highToLow') {
            sortCriteria = { afterDiscount: -1 };
        } else if (sortBy === 'averageRating') {
            const productData = await Product.aggregate([
                { $match: query }, 
                { $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'ratings'
                }},
                { $match: { ratings: { $exists: true, $ne: [] } } }, // Exclude products without the products having review
                { $addFields: {
                    averageRating: { $avg: '$ratings.rating' }
                }},
                { $sort: { averageRating: -1 } }
            ]);
            return res.json(productData);
        }

        const products = await Product.find(query).sort(sortCriteria);
        res.json(products);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
} 

const productFilterPopularity = async(req,res) => {
    try{
        const showBy = req.query.showBy;
        const maxPrice = req.query.maxPrice;
        const minPrice = req.query.minPrice;

        let query = {}
        if(minPrice && maxPrice){
            query.afterDiscount = {$gte: parseInt(minPrice), $lte: parseInt(maxPrice)};
        }

        let sortCriteria = {};
        if(showBy === 'Trending'){
            sortCriteria = {views:-1}
        }else if(showBy === 'NewArrivals'){
            sortCriteria = {updated_at: 1}
        }else if(showBy === 'AZ'){
            sortCriteria = {title: 1}
        }else if(showBy === 'ZA'){
            sortCriteria = {title:-1}
        }

        const products = await Product.find(query).sort(sortCriteria);
        res.json(products);

    }catch(error){
        console.error(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

//************* changePassword **************
const LoadchangePassword = async(req,res) => {
    try{
        const id = req.query.id;
        const userData = await User.findById({_id:id});
        const cart = await Cart.findOne({owner:userData})
        const cartItemCount = cart ? cart.items.length : 0;
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        if(userData){
            res.render('change-password',{
                user:userData,
                cartItemCount:cartItemCount,
                wishlistCount:wishlistCount
            });
        }else{
            redirect('/profile')
        }

    }catch(error){
        console.log(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

const changePassword = async(req,res) => {
    try{
        console.log('aaa');
        const userId = req.body.userId;
        const userData = await User.findById({_id:userId})
        const categoryData = await Category.find({status:'active'})
        const cart = await Cart.findOne({owner:userData})
        const cartItemCount = cart ? cart.items.length : 0;
        const {currentPassword,newPassword,confirmPassword} = req.body;

        const passwordMatch = await bcrypt.compare(currentPassword,userData.password);
        
        if(!passwordMatch){
            return res.render('change-password',{errorMessage:"Current password does not exists.",user:userData,cartItemCount:cartItemCount})
        }

        const hashedPassword = await bcrypt.hash(newPassword,10);
        await User.findByIdAndUpdate(userId, { $set: { password: hashedPassword }});
        return res.render('user-profile',{successMessage:'Your password is changed successfully',user:userData,cartItemCount:cartItemCount,category:categoryData})

    }catch(error){
        console.log(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
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
    getPopularProducts,
    getAllProducts,
    loadCategoryPage,
    filterProducts,
    sendReview,
    filterPopularity,
    searchProduct,
    productFilterPopularity,
    loadProductFilter,
    loadDistinctCategory,
    LoadchangePassword,
    changePassword,
    
};
