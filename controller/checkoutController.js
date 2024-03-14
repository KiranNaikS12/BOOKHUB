 const mongoose = require("mongoose");
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const randomString = require('randomstring');
const Return = require('../models/orderReturn');
const Wallet = require('../models/walletModel');
const Wishlist = require('../models/wishlistModel')
// require('dontenv').config()

// const razorypaySecretKey = process.env.RAZORPAY_SECRET_KEY;

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
        if (!data || item.quantity > data.countInStock || data.status === 'out-of-stock') {
          return res.status(400).json({ success: false, message: `Product ${item.title} is out of stock` });
        }
      };

      const userData = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });

      //to set the cart length;
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
      
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
      return res.render('user-checkout-page',{
        user:userData,
        category:categoryData, 
        cart:cart,
        cartItemCount:cartItemCount,
        fname:userData.firstname,
        lname:userData.lastname,
        mobile:userData.mobile,
        wishlistCount:wishlistCount

      })      
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const addOrderDetails = async (req, res) => {
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



//***********updateInQunatity***************
const updateInQuantity = async(req,res) => {
  const { userId, productId, newQuantity } = req.body;
  try{
      let cart = await Cart.findOne({ owner: userId });
      if (!cart) {
          return res.status(404).json({ error: "Cart not found." });
      }

      const cartItem = cart.items.find(item => item.productId.toString() === productId);
      if (!cartItem) {
          return res.status(404).json({ error: "Item not found in the cart." });
      }

      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ error: "Product not found." });
      }  

      if (newQuantity > 5) {
          return res.status(404).json({ error: true, message: "Maximum Limit Execceded" });
      }

      if(newQuantity > product.countInStock){
        return res.status(400).json({ error: "OutOfStock" });
      }
      
      const newPrice = product.afterDiscount * newQuantity;
      
      cartItem.quantity = newQuantity;
      cartItem.price = newPrice;
      let billTotal = cart.items.reduce((total, item) => total + item.price, 0);
      cart.billTotal = billTotal;


      if(newQuantity > 4 && cartItem.productStatus !== 'Limit-Exceeded'){
          cartItem.productStatus = 'Limit-Exceeded';
          await product.save();
      }else if(newQuantity <= 5 && cartItem.productStatus ==='Limit-Exceeded'){
          cartItem.productStatus = 'active';
          await product.save();
      }
      // console.log(newQuantity);
      // console.log(product.status)
      
      await cart.save();
      res.status(200).json({ success: true, message: "Cart updated successfully.", newPrice: cartItem.price, billTotal: billTotal, countInStock: product.countInStock });
  }catch(error){
      console.log(error.message);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
}


//***********RemoveProductOrder***************
const removeProductOrder = async(req,res) => {
  const {userId,productId} = req.body;
  try{
     const cart = await Cart.findOne({owner:userId});

  if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart Not Found" });
  }

  const removedItem = cart.items.find(item => item.productId == productId);
      if (!removedItem) {
          return res.status(404).json({ success: false, message: "Product Not Found in Cart" });
      }
      const quantityRemoved = removedItem.quantity;

  cart.items.find((item) => {
      if (item.productId + "" === productId + "") {
        console.log(item);
        cart.billTotal = (cart.billTotal-item.price < 0)?0:cart.billTotal-item.price       
        console.log(cart.billTotal);
        return true;
      } else {
        return false;
      }
  });

  await Cart.findByIdAndUpdate(cart._id, {
      $set: { billTotal: cart.billTotal },
      $pull: { items: { productId: productId } },
  });

  const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: "Product Not Found" });
      }

      return res.status(200).json({ success: true, message: "Product removed from the cart" });

  }catch(error){
      console.log(error.message);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
}


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
        data.countInStock -= item.quantity;
        await data.save();
        item.data = data;
      }

      const userData = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });

      const cartItemCount = cart ? cart.items.length : 0;
      const wishlist = await Wishlist.findOne({ user: userData });
      const wishlistCount = wishlist ? wishlist.items.length : 0;
      return res.render('order-summary',{
        user:userData,
        category:categoryData, 
        order:order,
        cart:cart,
        cartItemCount:cartItemCount,
        fname:userData.firstname,
        lname:userData.lastname,
        mobile:userData.mobile,
        email:userData.email,
        wishlistCount:wishlistCount
      })
  }catch(error){
    console.log(error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}


//***********LoadOrderHistory***************
const loadOrderHistory = async(req,res) => {
  // console.log('aaaaaaaaa');
   try{
      const categoryData = await Category.find({status:'active'});
      const userId = req.session.user_id;
      const cart = await Cart.findOne({owner:userId});
      let currentPage = parseInt(req.query.page) || 1;
      const perPage = 4;
      const skip = (currentPage -1) * perPage;

      const toatlOrders = await Order.countDocuments({user:userId,  orderStatus: { $ne: 'Deleted' }});
      const totalPages = Math.ceil(toatlOrders / perPage);

      const order = await Order.find({user:userId, orderStatus:{$ne:'Deleted'}},).sort({ createdAt: -1 }).skip(skip).limit(perPage);
  

      const userData = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });

      const cartItemCount = cart ? cart.items.length : 0;
      const wishlist = await Wishlist.findOne({ user: userData });
      const wishlistCount = wishlist ? wishlist.items.length : 0;
      res.render('order-history',{
        user:userData,
        category:categoryData, 
        order:order,
        cart:cart,
        cartItemCount:cartItemCount,
        currentPage:currentPage,
        totalPages:totalPages,
        wishlistCount:wishlistCount
    })

   }catch(error){
    console.log(error.message)
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
   }
}


const cancelOrder = async(req,res) => {
  try{
    const {orderId,reason} = req.body;
    // console.log(req.body)
    const deleteOrder = await Order.findById(orderId);

    if (!deleteOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const totalRefundAmount = deleteOrder.billTotal;

    const userId = req.session.user_id;
    const userWallet = await Wallet.findOne({user:userId});

    if (!userWallet) {
      return res.status(404).json({ success: false, message: "User's wallet not found" });
    }

    //updating wallet
    userWallet.walletBalance += totalRefundAmount;
    userWallet.amountSpent -= totalRefundAmount;
    userWallet.refundAmount += totalRefundAmount;
    await userWallet.save();

    // console.log('userWallet-status',userWallet);

    //updating order
    deleteOrder.orderStatus = 'Cancelled';
    deleteOrder.paymentStatus = 'Refunded'
    deleteOrder.cancellationReason = reason;
    await deleteOrder.save();

    //updating the product stock and it's status if
    const orderItems = deleteOrder.items;
    for (const item of orderItems){
      const product = await Product.findById(item.productId);
      if(!product){
        console.log(`Product not found for item: ${item}`);
        continue;
      }
      product.countInStock += item.quantity;

      if(product.status === 'out-of-stock'){
        product.status = 'active'
      }
      await product.save();
    }

    return res.status(200).json({ success: true, message: 'Order cancelled successfully' });
  }catch(error){
    console.log(error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const loadOrderTrack = async(req,res) => {
  try{
    const categoryData = await Category.find({status:'active'});
    const orderId = req.query.id;
    const userId = req.session.user_id;
    const cart = await Cart.findOne({owner:userId});
    const order = await Order.findOne({_id:orderId,user:userId});
    const returnData = await Return.findOne({ orderId: orderId });
    console.log(returnData);
    // console.log(order)

    const userData = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId)
    });

    const itemsWithCategory = await Promise.all(order.items.map(async (item) => {
      const book = await Product.findById(item.productId);
      return {
        ...item.toObject(),
        category: book ? book.category : '' 
      };
    }));

    const cartItemCount = cart ? cart.items.length : 0;
    const wishlist = await Wishlist.findOne({ user: userData });
    const wishlistCount = wishlist ? wishlist.items.length : 0;
    res.render('order-status',{
      user:userData,
      category:categoryData, 
      order: { ...order.toObject(), items: itemsWithCategory },
      returnStatus: returnData ? returnData.returnStatus : '',
      cart:cart,
      cartItemCount:cartItemCount,
      wishlistCount:wishlistCount
  })


  }catch(error){
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const sendReturnRequest = async (req, res) => {
  const { orderId, returnReason } = req.body;

  try {
      const userId = req.session.user_id;    
      const newReturn = new Return({
          user: userId,
          orderId: orderId,
          reason: returnReason,
          returnStatus: 'Initiated' 
      });
      // console.log(newReturn)

      await newReturn.save();

      await Order.findByIdAndUpdate(orderId,{orderStatus:'Returned'})

      res.status(200).json({ success: true, message: "Return request sent successfully" });
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


//***********DirectlyAddToCheckoutPage***************
const addToCheckout = async (req, res) => {
  const { productId } = req.body;
  try {
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: "Product Not Found" });
      }

      if (product.countInStock === 0 || product.status === 'out-of-stock') {
          return res.status(205).json({ success: false, message: "Product is out of stock" });
      }

      let userId = req.session.user_id;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      let cart = await Cart.findOne({ owner: userId });

      if (!cart) {
          cart = new Cart({
              owner: userId,
              items: [],
              billTotal: 0,
          });
      }

      const cartItem = cart.items.find(item => item.productId.toString() === productId);

      if (cartItem) {
          if(cartItem.quantity === 5){
            return res.status(403).json({ success: false, message: "You have already stored maximum stock in the cart" });
            }
          }

      cart.items.push({
          productId: productId,
          image: product.images,
          productPrice: product.afterDiscount,
          quantity: 1,
          price: product.afterDiscount,
          title: product.title
      });

      cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);
      await cart.save();

      return res.status(200).json({ success: true, message: 'Product added to cart successfully' });
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




module.exports = {
    loadCheckoutPage,
    addOrderDetails,
    loadOrderSummary,
    loadOrderHistory,
    cancelOrder,
    loadOrderTrack,
    sendReturnRequest,
    updateInQuantity,
    removeProductOrder,
    addToCheckout,
}