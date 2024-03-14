const mongoose = require("mongoose");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");
const axios = require('axios')
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
require('dotenv').config()



// ***********************************CreatingRazorPayOrder***************************************
const createRazorPayOrder = async(requestData) => {
    try{
        const response = await axios.post('https://api.razorpay.com/v1/orders', requestData,{
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(process.env.RAZORPAY_SECRET_KEY + ':').toString('base64')}`
            }
        });  
        const orderDetails = response.data;
        // console.log('orderDetails',orderDetails.headers)
        return orderDetails;

    }catch(error){
        console.error('Error creating RazorPay order:', error);
        throw new Error('Failed to create RazorPay order');
    }
}


const handleRazorPayOrderCreation = async(req,res) => {
    const {cartId,billTotal} = req.body;
    // console.log('reqbody',req.body);
    try{

        const cart = await Cart.findById(cartId);
        if (!cart) {
        return res.status(400).json({ success: false, message: 'Cart not found' });
        }    
        
        const deductedAmount = cart.discountedTotal > 0 ? cart.discountedTotal : billTotal;
        
        const  requestData = {
            amount: deductedAmount * 100,
            currency: 'INR',
            receipt: `receipt_${cartId}`,
            payment_capture: 1,
            
        }

        // console.log('amount',requestData.amount)
        const orderDetails = await createRazorPayOrder(requestData);
    
        
        res.status(200).json(orderDetails);
    }catch(error){
       console.error(error.message);
       res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }

// ************************************(razorPayment-End)*******************************************
  

//*************************************loadWallet(WalletData)*************************************
const loadWallet = async(req,res) => {
    try{
      const userId = req.session.user_id;
      const categoryData = await Category.find({status:'active'});
      const cart = await Cart.findOne({ owner: userId });
      const user = await User.findById(userId);
      const order = await Order.find({user:userId,orderStatus:{$ne:'Deleted'}});
      const wallet = await Wallet.findOne({user:userId});
    //   console.log('wallet',wallet);

      if(!user){
        return res.status(404).json({ success: false, message: "user not found" });
      }
  
      if (cart) {
        cart.items = await Promise.all(
          cart.items.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (
              product &&
              (product.status === "active" || product.status === "out-of-stock")
            ) {
              return { ...item, data: product };
            }
          })
        );
        cart.items = cart.items.filter(
          (item) => item !== null && item !== undefined
        );
      }
  
      const cartItemCount = cart ? cart.items.length : 0;
      const wishlist = await Wishlist.findOne({ user: user });
      const wishlistCount = wishlist ? wishlist.items.length : 0;
      res.render('user-wallet',{
        user:user,
        category:categoryData,
        cartItemCount:cartItemCount,
        order:order,
        wallet:wallet,
        wishlistCount:wishlistCount
  
      })
  
    }catch(error){
      console.log(error.message);
      return res.status(500).json({error:'Internal server error'});
    }
  }


//*************************************add-Wallet****************************************** */
const addWallet = async (req,res) => {
    const {userId,amount} = req.body
    console.log('req.body',req.body);
    try{
    const userData = await User.findById(userId);
    if(!userData){
        return res.status(404).json({ success: false, message: "user not found" });
    }

    const parsedAmount = parseInt(amount, 10);

    let wallet = await Wallet.findOne({user:userId})
    if(!wallet){
        wallet = new Wallet({
            user:userId,
            walletBalance:parsedAmount || 0,
            amountSpent:0,
            refundAmount:0
        })
    }else{
        wallet.walletBalance += parsedAmount;
    }
    
    await wallet.save();

    const requestData = {
        amount: amount * 100,
        currency: 'INR',
        receipt: userId,
        payment_capture: 1
    };
    // console.log('requestData',requestData);
    const razorpayOrder = await createRazorPayOrder(requestData);

    return res.status(200).json({ success: true, message: "Wallet updated successfully", walletBalance: wallet.walletBalance, razorpayOrder });
    }catch(error){
        console.log(error.message);
        return res.status(500).json({error:'Internal server error'})
    }
}


const handleWalletPaymentOrderCreation = async (req, res) => {
  const { cartId, billTotal } = req.body;
  try {
      const cart = await Cart.findById(cartId);
      if (!cart) {
          return res.status(400).json({ success: false, message: 'Cart not found' });
      }

      const userId = req.session.user_id;
      const userWallet = await Wallet.findOne({ user: userId });
      if (!userWallet || userWallet.walletBalance < billTotal) {
          return res.status(400).json({ message: 'Insufficient balance in the wallet' });
      }

      const deductedAmount = cart.discountedTotal > 0 ? cart.discountedTotal : billTotal;

      //wallet updation
      userWallet.walletBalance -= deductedAmount;
      userWallet.amountSpent += deductedAmount;

      await userWallet.save();

      return res.status(200).json({ message: 'Order created successfully' });
  } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Internal server error' });
  }
};

const loadPaymentHistory = async(req,res) => {
  try{

    const userId = req.session.user_id;
    const categoryData = await Category.find({status:'active'});
    const cart = await Cart.findOne({owner:userId});
    const user = await User.findById(userId);
    const order = await Order.find({user:userId,orderStatus:{$ne:'Deleted'}});
    const wallet = await Wallet.findOne({user:userId});

    if(!user){
      return res.status(404).json({ success: false, message: "user not found" });
    }

    if (cart) {
      cart.items = await Promise.all(
        cart.items.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (
            product &&
            (product.status === "active" || product.status === "out-of-stock")
          ) {
            return { ...item, data: product };
          }
        })
      );
      cart.items = cart.items.filter(
        (item) => item !== null && item !== undefined
      );
    }
    
    const cartItemCount = cart ? cart.items.length : 0;
    const wishlist = await Wishlist.findOne({ user: user });
    const wishlistCount = wishlist ? wishlist.items.length : 0;
    res.render('user-payment-history',{
      user:user,
      category:categoryData,
      cartItemCount:cartItemCount,
      order:order,
      wallet:wallet,
      wishlistCount:wishlistCount
    
    })

  }catch(error){
    console.log(error.message);
    return res.status(500).json({success:false,message:'Internal server error'})
  }
}




module.exports = {
    handleRazorPayOrderCreation,
    loadWallet,
    addWallet,
    handleWalletPaymentOrderCreation,
    loadPaymentHistory
}  