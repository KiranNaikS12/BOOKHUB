const mongoose = require("mongoose");
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const randomString = require('randomstring');

//***********GenerateRandomStringToCheckIfItIsUnique***************
const isOrderIdUnique = async (orderId) => {
  const existingOrder = await Order.findOne({ oId: orderId });
  return !existingOrder;
};

//***********LoadCheckOutPage***************
const loadCheckoutPage = async(req,res) => {
    try{
      const categoryData = await Category.find({status:'active'});
      const userId = req.session.user_id;
      const cart = await Cart.findOne({owner:userId})


      if(!cart || !cart.items || cart.items.length === 0){
        return res.status(205).json({success:false, message:"Your cart is empty"})
      }
    
      for(const item of cart.items){
        let data = await Product.findById(item.productId);
        item.data = data;
      };

      const userData = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });

      const cartItemCount = cart ? cart.items.length : 0;
      return res.render('user-checkout-page',{
        user:userData,
        category:categoryData, 
        cart:cart,
        cartItemCount:cartItemCount,
        fname:userData.firstname,
        lname:userData.lastname,
        mobile:userData.mobile

      })      
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

//***********AddToOrderPage***************
const addOrderDetails = async (req, res) => {
  const { cartId, additionalMobile, shippingAddress, paymentMethod, orderNotes } = req.body

  console.log(req.body)
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
              city:shippingAddress.city,
              state: shippingAddress.state,
              country:shippingAddress.country,
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
        return {
            productId: item.productId,
            title: product.title, 
            image: item.image,
            productPrice: item.productPrice,
            quantity: item.quantity,
            price: item.price
        };
    }));

      // Generate unique order ID
      let uniqueOrderId = randomString.generate(10);
      while (!(await isOrderIdUnique(uniqueOrderId))) {
          uniqueOrderId = randomString.generate(10);
      }

      const orderData = {
          user: userId,
          cart: cart._id,
          oId: uniqueOrderId,
          orderStatus:'Pending',
          items: orderItems,
          billTotal: cart.billTotal,
          additionalMobile: additionalMobile,
          paymentMethod: paymentMethod,
          orderNotes: orderNotes,
          shippingAddress: orderShippingAddress
      };

      console.log("orderData",orderData);

      cart.items = [];
      cart.billTotal = 0;
      await cart.save();

      // console.log('Creating order with data:', orderData);
      const order = new Order(orderData);
      await order.save();
      return res.status(200).json({ success: true, message: 'Proceeded to checkout page successfully' });
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

//***********LoadOrderSummary***************
const loadOrderSummary = async(req,res) => {
  try{
      const categoryData = await Category.find({status:'active'});
      const userId = req.session.user_id;
      const cart = await Cart.findOne({owner:userId});
      const order = await Order.findOne({user:userId}).sort({ createdAt: -1 });

      if(!order || !order.items || order.items.length === 0){
        return res.status(205).json({success:false, message:"No order data found"})
      }

      for(const item of order.items){
        let data = await Product.findById(item.productId);
        item.data = data;
      }

      const userData = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });

      const cartItemCount = cart ? cart.items.length : 0;
      return res.render('order-summary',{
        user:userData,
        category:categoryData, 
        order:order,
        cart:cart,
        cartItemCount:cartItemCount,
        fname:userData.firstname,
        lname:userData.lastname,
        mobile:userData.mobile,
        email:userData.email
      })




  }catch(error){
    console.log(error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}


//***********LoadOrderHistory***************
const loadOrderHistory = async(req,res) => {
  console.log('aaaaaaaaa');
   try{
      const categoryData = await Category.find({status:'active'});
      const userId = req.session.user_id;
      const cart = await Cart.findOne({owner:userId});
      const order = await Order.find({user:userId, orderStatus:{$ne:'Canceled'}},).sort({ createdAt: -1 });
      // console.log('order',order)

      const userData = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });

      const cartItemCount = cart ? cart.items.length : 0;
      res.render('order-history',{
        user:userData,
        category:categoryData, 
        order:order,
        cart:cart,
        cartItemCount:cartItemCount,
    })

   }catch(error){
    console.log(error.message)
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
   }
}


const cancelOrder = async(req,res) => {
  try{
    const {orderId} = req.body;
    console.log(req.body)
    const deleteOrder = await Order.findByIdAndUpdate(orderId,{orderStatus:'Canceled'},{new:true});

    if (!deleteOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, message: "Order successfully canceled" });
  }catch(error){
    console.log(error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
    loadCheckoutPage,
    addOrderDetails,
    loadOrderSummary,
    loadOrderHistory,
    cancelOrder
}