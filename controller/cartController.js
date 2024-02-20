const mongoose = require("mongoose");
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');

//***********loadCartPage***************** */
const loadCartPage = async(req,res) => {
    try{
        const categoryData = await Category.find({status:'active'})
        const userId = req.session.user_id;
        const cart = await Cart.findOne({owner:userId});

       
        for(const item of cart.items){
            let data = await Product.findById(item.productId);
            item.data = data;
        }
        const userData = await User.findOne({
            _id: new mongoose.Types.ObjectId(userId)
        });

        const cartItemCount = cart ? cart.items.length : 0;
        return res.render('user-cart-page',{
            user:userData,
            category:categoryData,
            cart:cart,
            cartItemCount: cartItemCount
        });
       
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}


//***********AddToCart***************** */
const addToCart = async(req,res) => {
    try{
        const {productId, countInStock} = req.body;
        const product = await Product.findById(productId);
        console.log(product);
        if(!product){
            return res.status(404).json({sucess:false, message: "Product Not Found" })
        }

        if(product.countInStock === 0){
            return res.status(400).json({success: false, message: "Product is out of stock" })
        }

        let userId = req.session.user_id;
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({ success: false, message: "user is not found" });
        }

        let cart = await Cart.findOne({owner: userId});
        
        if(!cart){
            cart = new Cart({
                owner:userId,
                items:[],
                billTotal: 0,
            });
        }
        const cartItem = cart.items.find((item) => 
          item.productId.toString() === productId
        )

        let outOfStock = false;
        if (cartItem) {
            if (cartItem.quantity < countInStock) {
                cartItem.quantity += 1;
                cartItem.productPrice = product.afterDiscount;
                cartItem.price = cartItem.quantity * product.afterDiscount;
                cartItem.image = product.images;
            } else {
                product.status = 'out-of-stock';
                await product.save();
                outOfStock = true;
            }
        } else{
            cart.items.push({
                productId: productId,
                image: product.images,
                productPrice: product.afterDiscount,
                quantity:1,
                price: product.afterDiscount,
            });
        }
        cart.billTotal = cart.items.reduce((total,item) => total + item.price, 0)
        await cart.save();
        if(outOfStock===true) {
            res.status(205).json({ status: true });
        }else if (outOfStock===false) {
            res.status(200).json({ status: true});
        }

    }catch(error){
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

//***********UpdateCart***************
const updateQuantity = async(req,res) => {
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

        if (newQuantity >= product.countInStock) {
            return res.status(400).json({ error: true, message: "Stock limit exceeded" });
        }
        
        const newPrice = product.afterDiscount * newQuantity;
        
        cartItem.quantity = newQuantity;
        cartItem.price = newPrice;
        let billTotal = cart.items.reduce((total, item) => total + item.price, 0);
        cart.billTotal = billTotal;
        if(newQuantity < product.countInStock && product.status === 'out-of-stock'){
            product.status = 'active';
            await product.save();
        }
        
        await cart.save();
        res.status(200).json({ success: true, message: "Cart updated successfully.", newPrice: cartItem.price, billTotal:cart.billTotal});
    }catch(error){
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

//***********RemoveProductFromTheCart***************
const removeProduct = async(req,res) => {
    const {userId,productId} = req.body;
    try{
       console.log(userId);
       console.log(productId);
       const cart = await Cart.findOne({owner:userId});

    if (!cart) {
        return res
          .status(404)
          .json({ success: false, message: "Cart Not Found" });
    }

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

    return res.status(200).json({ success: true, message: "Product removed from the cart" });

    }catch(error){
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

//***********ClearCart***************
const clearEntireCart = async(req,res) => {
    const {userId} = req.body;  
    try{
        const cart = await Cart.findOne({owner:userId})
       
        if(!cart){
            return res
            .status(404)
            .json({ success: false, message: "Cart Not Found" }); 
        }

        cart.items = [];
        cart.billTotal = 0;

        await cart.save();
        return res.status(200).json({success:true, message:"Cart Cleared Successfully"});
    }catch(error){
        console.log(error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}



module.exports = {
    addToCart,
    loadCartPage,
    updateQuantity,
    removeProduct,
    clearEntireCart,
}