const mongoose = require("mongoose");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");
const axios = require('axios')
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const randomString = require('randomstring');
require('dotenv').config()


//***********GenerateRandomStringToCheckIfItIsUnique***************
const isOrderIdUnique = async (orderId) => {
  const existingOrder = await Order.findOne({ oId: orderId });
  return !existingOrder;
};


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
      const order = await Order.find({user:userId,orderStatus:{$ne:'Deleted'}}).limit(3).sort({orderDate:-1})
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

//*******************************Handling-payment-with-wallet*********************************** */
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

//*************************************Payment-History-Page****************************************** */
const loadPaymentHistory = async(req,res) => {
  try{
    const currentPage = parseInt(req.query.page) || 1;
    const perPage = 6;
    const startIndex = (currentPage - 1) * perPage;
    const userId = req.session.user_id;
    const categoryData = await Category.find({status:'active'});
    const cart = await Cart.findOne({owner:userId});
    const user = await User.findById(userId);
    const order = await Order.find({user:userId,orderStatus:{$ne:'Deleted'}}).populate('items.productId user').skip(startIndex).limit(perPage).sort({orderDate:-1})
    const wallet = await Wallet.findOne({user:userId});

    const orderCount = await Order.countDocuments({user:userId,orderStatus:{$ne:'Deleted'}}).populate('items.productId user');
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

    const totalPages = Math.ceil(orderCount/perPage)
    res.render('user-payment-history',{
      user:user,
      userEmail:user.email,
      category:categoryData,
      cartItemCount:cartItemCount,
      order:order,
      wallet:wallet,
      wishlistCount:wishlistCount,
      totalPages:totalPages,
      currentPage:currentPage

    })

  }catch(error){
    console.log(error.message);
    return res.status(500).json({success:false,message:'Internal server error'})
  }
}


//************************************Filtering-Payment-History****************************************** */
const filterPaymentHistory = async(req,res)=> {
  try{

    const {orderStatus} = req.query;

    const filteredPaymentHistory = await Order.find({orderStatus}).populate('items.productId user')
    res.json(filteredPaymentHistory)
    console.log('filteredPaymentHistory',filteredPaymentHistory);

  }catch(error){
    console.log(error.message);
    res.status(500).json({success:false,message:'Internal server error'});
  }
}

const handlePaymentWithWallet = async (req, res) => {
  const { cartId, additionalMobile, shippingAddress, paymentMethod, orderNotes } = req.body;

  console.log(req.body);
  try {
      const cart = await Cart.findById(cartId);
      if (!cart) {
          return res.status(400).json({ success: false, message: 'Cart Not Found' });
      }

      const userId = req.session.user_id;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      let orderShippingAddress;

      if (shippingAddress) {
          orderShippingAddress = {
              street: shippingAddress.street,
              city: shippingAddress.city,
              state: shippingAddress.state,
              country: shippingAddress.country,
              postalCode: shippingAddress.postalCode,
              type: shippingAddress.addressType 
          };
      } else {
          if (user.address.length > 0) {
              const addressValue = user.address[user.address.length - 1];
              orderShippingAddress = {
                  street: addressValue.street,
                  city: addressValue.city,
                  state: addressValue.state,
                  country: addressValue.country,
                  postalCode: addressValue.postalCode,
                  type: addressValue.type
              };
          } else {
              return res.status(400).json({ success: false, message: 'User does not have a default address' });
          }
      }

      const orderItems = await Promise.all(cart.items.map(async (item) => {
          const product = await Product.findById(item.productId);
          let productStatus = 'active';
          if (product.countInStock - item.quantity === 0) {
              productStatus = 'out-of-stock';
          }
          await Product.findByIdAndUpdate(item.productId, { status: productStatus });
          return {
              productId: item.productId,
              title: product.title, 
              image: item.image,
              productPrice: item.productPrice,
              quantity: item.quantity,
              price: item.price,
              productStatus: productStatus
          };
          
      }));
      

      // Generate unique order ID
      let uniqueOrderId = randomString.generate(10);
      while (!(await isOrderIdUnique(uniqueOrderId))) {
          uniqueOrderId = randomString.generate(10);
      }

      let paymentStatus = '';
      if(paymentMethod === 'Cash On Delivery'){
        paymentStatus = 'Pending';
      }else{
        paymentStatus = 'Success';
      }
      
      const billTotal = cart.discountedTotal > 0 ? cart.discountedTotal : cart.billTotal;

      const orderData = {
          user: userId,
          cart: cart._id,
          oId: uniqueOrderId,
          orderStatus:'Pending',
          items: orderItems,
          billTotal: billTotal,
          additionalMobile: additionalMobile,
          paymentMethod: paymentMethod,
          orderNotes: orderNotes,
          shippingAddress: orderShippingAddress,
          paymentStatus: paymentStatus
      };

      console.log("orderData", orderData);

      cart.items = [];
      cart.billTotal = 0;
      await cart.save();

      const order = new Order(orderData);
      await order.save();

      await Cart.deleteOne({_id:cartId});

      return res.status(200).json({ success: true, message: 'Proceeded to checkout page successfully' });
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


const handlePaymentWithRazorPay = async(req,res) =>{
  const { cartId, additionalMobile, shippingAddress, paymentMethod, orderNotes } = req.body;

  console.log(req.body);
  try{
    const cart = await Cart.findById(cartId);
      if (!cart) {
          return res.status(400).json({ success: false, message: 'Cart Not Found' });
      }

      const userId = req.session.user_id;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      let orderShippingAddress;

      if (shippingAddress) {
          orderShippingAddress = {
              street: shippingAddress.street,
              city: shippingAddress.city,
              state: shippingAddress.state,
              country: shippingAddress.country,
              postalCode: shippingAddress.postalCode,
              type: shippingAddress.addressType 
          };
      } else {
          if (user.address.length > 0) {
              const addressValue = user.address[user.address.length - 1];
              orderShippingAddress = {
                  street: addressValue.street,
                  city: addressValue.city,
                  state: addressValue.state,
                  country: addressValue.country,
                  postalCode: addressValue.postalCode,
                  type: addressValue.type
              };
          } else {
              return res.status(400).json({ success: false, message: 'User does not have a default address' });
          }
      }

      const orderItems = await Promise.all(cart.items.map(async (item) => {
          const product = await Product.findById(item.productId);
          let productStatus = 'active';
          if (product.countInStock - item.quantity === 0) {
              productStatus = 'out-of-stock';
          }
          await Product.findByIdAndUpdate(item.productId, { status: productStatus });
          return {
              productId: item.productId,
              title: product.title, 
              image: item.image,
              productPrice: item.productPrice,
              quantity: item.quantity,
              price: item.price,
              productStatus: productStatus
          };
          
      }));
      

      // Generate unique order ID
      let uniqueOrderId = randomString.generate(10);
      while (!(await isOrderIdUnique(uniqueOrderId))) {
          uniqueOrderId = randomString.generate(10);
      }
      
      const billTotal = cart.discountedTotal > 0 ? cart.discountedTotal : cart.billTotal;

      const orderData = {
          user: userId,
          cart: cart._id,
          oId: uniqueOrderId,
          orderStatus:'Pending',
          items: orderItems,
          billTotal: billTotal,
          additionalMobile: additionalMobile,
          paymentMethod: paymentMethod,
          orderNotes: orderNotes,
          shippingAddress: orderShippingAddress,
          
      };

      console.log("orderData", orderData);

      cart.items = [];
      cart.billTotal = 0;
      await cart.save();

      const order = new Order(orderData);
      await order.save();

      await Cart.deleteOne({_id:cartId});

      return res.status(200).json({ success: true, message: 'Proceeded to checkout page successfully' });
  }catch(error){
    console.log(error.message);
    return res.status(500).json({success:false, message:'Internal Server Error'})
  }
}


module.exports = {
    handleRazorPayOrderCreation,
    loadWallet,
    addWallet,
    handleWalletPaymentOrderCreation,
    loadPaymentHistory,
    filterPaymentHistory,
    handlePaymentWithWallet,
    handlePaymentWithRazorPay
}  