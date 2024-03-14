const mongoose = require("mongoose");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");
const axios = require('axios')
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const Coupon = require('../models/couponModel');
require('dotenv').config()


const loadCouponPage = async(req,res) => {
    try{
        const userId = req.session.user_id;
        const categoryData = await Category.find({status:'active'});
        const cart = await Cart.findOne({owner:userId});
        const user = await User.findById(userId);
        const couponData = await Coupon.find({status:{$ne:'delete'},users:{$ne:userId}})

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
        res.render('user-coupon-list',{
            user:user,
            category:categoryData,
            cartItemCount:cartItemCount,
            coupon:couponData,
            wishlistCount:wishlistCount
        })

    }catch(error){
        console.log(error.message);
        return res.status(500).json({success:false,message:'Internal server error'});
    }
}

//Function to calculate discount based on the coupon and bill total
const calculateDiscount = (coupon,billTotal) => {
  let discount = 0;
  if(coupon){
      //check coupon is active:
      if(coupon.isActive){
         const currentDate = new Date();
         if(currentDate >= coupon.startDate && currentDate <= coupon.endDate) {
             if(billTotal >= coupon.minimumAmount && billTotal <= coupon.maximumAmount){
                discount = Math.floor((coupon.discount / 100) * billTotal);
             }
         }
      }
  }
  return discount;
};


const applyCoupon = async (req, res) => {
  const { coupon } = req.body;
  // console.log('couponCode:', req.body);
  try {
      const existingCoupon = await Coupon.findOne({ couponCode: coupon });
      if (!existingCoupon) {
          return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }

      const userId = req.session.user_id;
      const cartData = await Cart.findOne({ owner: userId });
      if (!cartData) {
          return res.status(404).json({ success: false, message: 'Cart data not found' });
      }

      console.log('billTotal-before', cartData.billTotal);

      if (existingCoupon.users.includes(userId)) {
          return res.status(400).json({ success: false, message: 'Coupon code is Invalid' });
      }

      const discount = calculateDiscount(existingCoupon, cartData.billTotal);

      if (discount === 0) {
          return res.status(400).json({ success: false, message: 'Coupon is not applicable' });
      }

      cartData.discountedTotal =  cartData.billTotal - discount;
      console.log('billTotal-after', cartData.discountedTotal);
      await cartData.save();

      existingCoupon.users.push(userId);
      await existingCoupon.save();

      return res.status(200).json({ success: true, message: 'Coupon applied successfully', discount });
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}



module.exports = {
    loadCouponPage,
    applyCoupon
}