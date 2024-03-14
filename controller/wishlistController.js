const mongoose = require("mongoose");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");

//***********GetWhislist***************** */
const loadWhislist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const userData = await User.findById(userId)
    const categoryData = await Category.find({ status: "active" });
    const cart = await Cart.findOne({ owner: userId });
    const wishlistData = await Wishlist.findOne({ user: userId }).populate(
      "items.productId"
    ); //populate productId field from Book
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
    const wishlistCount = wishlistData ? wishlistData.items.length : 0;
    return res.render("user-wishlist", {
      cartItemCount: cartItemCount,
      category: categoryData,
      user: userData,
      wishlist: wishlistData,
      wishlistCount:wishlistCount
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

//***********AddTowhislist***************** */
const addToWhislist = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ sucess: false, message: "Product Not Found" });
    }

    let userId = req.session.user_id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user is not found" });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId, 
        items: [],
        status: "added",
      });
    }

    // Check if the product already exists in the wishlist
    if (
      wishlist.items.some((item) => item.productId.toString() === productId)
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message: "Item already exists in the wishlist",
        });
    }

    if (wishlist) {
      wishlist.items.push({
        productId: productId,
      });
    }
    await wishlist.save();
    // console.log('wishlistData:',wishlist);
    return res.status(200).json({ status: true });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

//***********reomveWhislist***************** */
const removeWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ sucess: false, message: "Product Not Found" });
    }

    const userId = req.session.user_id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user is not found" });
    }

    const wishlist = await Wishlist.findOne({ user: userId });

    //to remove the specific product from the wishlist:
    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId
    );

    if (wishlist.items.length === 0) {
      wishlist.status = "not-added";
    }
    await wishlist.save();
    return res
      .status(200)
      .json({ success: true, message: "Product removed from wishlist" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};



module.exports = {
  loadWhislist,
  addToWhislist,
  removeWishlist,

};
