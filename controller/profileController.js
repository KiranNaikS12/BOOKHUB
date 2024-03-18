const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Wishlist = require('../models/wishlistModel');


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
        const requestedRoute = req.url;
        res.render('user-404-page',{message:`The following route '${requestedRoute}' is not available`});
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
        const requestedRoute = req.url;
        res.render('user-404-page',{message:`The following route '${requestedRoute}' is not available`});
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

        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        return res.render('user-profile',{successMessage:'Your password is changed successfully',user:userData,cartItemCount:cartItemCount,category:categoryData,wishlistCount:wishlistCount})

    }catch(error){
        console.log(error.message);
        res.status(500).json({ error: "Internal server error" });
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
            const wishlist = await Wishlist.findOne({ user: userData });
            const wishlistCount = wishlist ? wishlist.items.length : 0;
            res.render('user-profile', { successMessage: 'Address added successfully', user: userData, category: categoryData,cartItemCount:cartItemCount,wishlistCount:wishlistCount });
        }

    }catch(error){
        console.log(error.message);
        res.status(500).json({ error: 'Internal server error' });
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

module.exports = {
    loadProfilePage,
    loadEditUser,
    userUpdateLoad,
    LoadchangePassword,
    changePassword,
    insertAddress,
    loadupdateUserAddress,
    updateUserAddress,
    deleteUserAddress,
    loadHomePage
}