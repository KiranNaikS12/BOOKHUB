const mongoose = require("mongoose");
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');

//***********LoadCheckOutPage***************
const loadCheckoutPage = async(req,res) => {
    try{
       
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

//***********AddCheckOutPage***************
const addCheckout = async(req,res) => {
    try{
       const {cartId} = req.body;
       const cart = await Cart.findById(cartId);
       console.log('cartId',cart);

       if(!cart){
        return res.status(400).json({success:false,message:'Cart Not Found'})
       }

       if(cart.items.length === 0){
        return res.status(205).json({success:false, message:"Your cart is empty"})
       }

       let userId = req.session.user_id;
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({ success: false, message: "user is not found" });
        }
 
        const orderItems = cart.items.map(item => ({
            productId: item.productId,
            image: item.image,
            productPrice: item.productPrice,
            quantity:item.quantity,
            price:item.price
        }));

        const orderData ={
            user:userId,
            cart:cart._id,
            items:orderItems,
            billTotal:cart.billTotal,
        }
        const order = new Order(orderData);
        await order.save();
        return res.status(200).json({success:true,message:'Procceded to checkout page successfully'});
    }catch(error){
        console.log(error.message);
    }
}

module.exports = {
    loadCheckoutPage,
    addCheckout 
}