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
        const {productId} = req.body;
        const product = await Product.findById(productId);
        // console.log(product);
        if(!product){
            return res.status(404).json({sucess:false, message: "Product Not Found" })
        }

        if(product.countInStock === 0 || product.status === 'out-of-stock'){
            return res.status(205).json({success: false, message: "Product is out of stock" })
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
            if (cartItem.quantity < 5) {
                cartItem.quantity += 1;
                cartItem.productPrice = product.afterDiscount;
                cartItem.price = cartItem.quantity * product.afterDiscount;
                cartItem.image = product.images;
                cartItem.title = product.title;
                
            } else {
                cartItem.productStatus = 'Limit-Exceeded';
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
                title:product.title
            });
        }
        cart.billTotal = cart.items.reduce((total,item) => total + item.price, 0)
        await cart.save();

        if(!outOfStock && product.countInStock > 0){
            product.countInStock -=1;
            if(product.countInStock === 0){
                product.status = 'out-of-stock'
            }
            await product.save();
        }

        console.log('remaining:',product.countInStock);
        if(outOfStock===true) {
            res.status(205).json({ status: true });
        }else{
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

        if (newQuantity > 5) {
            return res.status(404).json({ error: true, message: "Maximum Limit Execceded" });
        }
        const oldQuantity = cartItem.quantity;
        console.log('oldQuanity:',oldQuantity);
        console.log('newQuantity:',newQuantity);

        let quantityDifference = newQuantity- oldQuantity;
        console.log('QuantityDiffernce',quantityDifference);
 
        console.log('totalStock',product.countInStock);
        if (quantityDifference > 0) {
            // Quantity is increasing
            if (product.countInStock < quantityDifference) {
                return res.status(400).json({ error: "Insufficient stock." });
            }
            product.countInStock -= quantityDifference;
        } else if (quantityDifference < 0) {
            // Quantity is decreasing
            const remainingQuantity = product.countInStock + Math.abs(quantityDifference);
            console.log('remainingQuantity',remainingQuantity); 
            if (remainingQuantity < 0) { 
                return res.status(400).json({ error: "Invalid quantity." });
            }
            product.countInStock = remainingQuantity;
        }

        product.status = product.countInStock === 0 ? 'out-of-stock' : 'active';
        await product.save();

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
        res.status(200).json({ success: true, message: "Cart updated successfully.", newPrice: cartItem.price, billTotal:cart.billTotal, countInStock: product.countInStock});
    }catch(error){
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

//***********RemoveProductFromTheCart***************
const removeProduct = async(req,res) => {
    const {userId,productId} = req.body;
    try{
    //    console.log(userId);
    //    console.log(productId);
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

        product.countInStock += quantityRemoved;
        product.status = product.countInStock > 0 ? 'active' : 'out-of-stock';
        await product.save();

        console.log('after deleting:',product.countInStock);
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
        const product = await Product.find();
        if(!cart){
            return res
            .status(404)
            .json({ success: false, message: "Cart Not Found" }); 
        }

        //updating the status
        for(const item of cart.items){
            const product = await Product.findById(item.productId);

            if(product){
                product.countInStock += item.quantity;
                if(product.status === 'out-of-stock'){
                    product.status = 'active';
                    
                }
                await product.save();
            }
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