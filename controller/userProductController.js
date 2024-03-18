const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Review = require('../models/reviewModel');
const Wishlist = require('../models/wishlistModel');


// ***************LoadProduct***************
const loadProduct = async(req,res) => {
    try{
        const page = parseInt(req.query.page) || 1; //getting current page from the query parameter by setting default to 1;
        const perPage= 9;
        const startIndex = (page - 1) * perPage;
        const  userData = await User.findById({_id:req.session.user_id})
        const productData=await Product.find({is_published:1,status:{$ne:'inactive'}}).skip(startIndex).limit(perPage);
        
        
        const productCount = await Product.countDocuments({ is_published: 1, status: { $ne: 'inactive' } }); // Total number of products
        const totalPages = Math.ceil(productCount / perPage); //calculating total number of pages

        const categoryData = await Category.find({status:'active'})
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


        const productWithStatus = productData.map(productItem => {
            let productStat = 'active';

            if(cartData && cartData.items){
                const cartItem = cartData.items.find(item => item.productId.equals(productItem._id));
                productStat = cartItem ? cartItem.productStatus: 'active';
            }
            return {
                _id:productItem._id,
                images:productItem.images,
                category:productItem.category,
                title:productItem.title,
                afterDiscount:productItem.afterDiscount,
                price: productItem.price,
                status:productItem.status,
                productStatus: productStat
            };
        })
        let cartItemCount = 0;
        if (cartData && cartData.items) {
            cartItemCount = cartData.items.length;
        }
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        res.render('user-product-list',{user:userData,                  
        product:productWithStatus,
        category: categoryData,
        cartItemCount:cartItemCount,
        totalPages: totalPages,
        currentPage: page,
        wishlistCount:wishlistCount
    })
    }catch(error){
        console.log(error.message)
    }
}

// ***************LoadIndividualProduct***************
const LoadIndIvidualProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById(req.session.user_id);
        const productData = await Product.findById(id);
        const categoryData = await Category.find({ status: 'active' });
        const reviewData = await Review.find({productId:id}).populate({path:'userId',select:'firstname'})

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
        if (cartData && cartData.items) {
            cartItemCount = cartData.items.length;
        }

        if (productData) {
            productData.views++;
            await productData.save();

            // Find related products with the same category
            const relatedCategory = await Product.find({category:productData.category,_id:{$ne:productData._id}}).limit(4);
            const wishlist = await Wishlist.findOne({ user: userData });
            const wishlistCount = wishlist ? wishlist.items.length : 0;
            res.render('user-product-view', {
                product: productData,
                user: userData,
                category: categoryData,
                cartItemCount: cartItemCount,
                relatedCategory:relatedCategory,
                review:reviewData,
                wishlistCount:wishlistCount
            });
        } else {
            res.redirect('/product-list');
        }
    } catch (error) {
        console.log(error);
        const requestedRoute = req.url;
        res.render('user-404-page',{message:`The following route '${requestedRoute}' is not available`});
    }
}

const loadProductFilter = async (req, res) => {
    try {
        const sortBy = req.query.sortBy;
        const maxPrice = req.query.maxPrice;
        const minPrice = req.query.minPrice;

        let query = {}

        if(minPrice && maxPrice){
            query.afterDiscount = {$gte: parseInt(minPrice), $lte: parseInt(maxPrice)};
        }

        let sortCriteria = {};
        if (sortBy === 'lowToHigh') {
            sortCriteria = { price: 1 }; 
        } else if (sortBy === 'highToLow') {
            sortCriteria = { afterDiscount: -1 };
        } else if (sortBy === 'averageRating') {
            const productData = await Product.aggregate([
                { $match: query }, 
                { $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'ratings'
                }},
                { $match: { ratings: { $exists: true, $ne: [] } } }, // Exclude products without the products having review
                { $addFields: {
                    averageRating: { $avg: '$ratings.rating' }
                }},
                { $sort: { averageRating: -1 } }
            ]);
            return res.json(productData);
        }

        const products = await Product.find(query).sort(sortCriteria);
        res.json(products);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}


const productFilterPopularity = async(req,res) => {
    try{
        const showBy = req.query.showBy;
        const maxPrice = req.query.maxPrice;
        const minPrice = req.query.minPrice;

        let query = {}
        if(minPrice && maxPrice){
            query.afterDiscount = {$gte: parseInt(minPrice), $lte: parseInt(maxPrice)};
        }

        let sortCriteria = {};
        if(showBy === 'Trending'){
            sortCriteria = {views:-1}
        }else if(showBy === 'NewArrivals'){
            sortCriteria = {updated_at: 1}
        }else if(showBy === 'AZ'){
            sortCriteria = {title: 1}
        }else if(showBy === 'ZA'){
            sortCriteria = {title:-1}
        }

        const products = await Product.find(query).sort(sortCriteria);
        res.json(products);

    }catch(error){
        console.error(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ***************Serach-Function***************
const searchProduct = async(req,res) => {
    try{
        const query = req.query.query;
        const result = await Product.find({ title: { $regex: query, $options: 'i' } })
        console.log(result)
        res.json(result);
    }catch(error){
        console.error('Error searching for books:', error);
        res.status(500).json({ error: 'An error occurred while searching for books' });
    }
}

// ***************Send-Review***************
const sendReview = async(req,res) => {
    try{
        const {productId, rating, reviewText} = req.body;
        console.log(req.body);
        const userId = req.session.user_id; 

        
        if (!productId || !rating || !reviewText) {
            return res.status(400).json({ message: 'Missing required fields' });
        }       
        
        const newReview = new Review({
            productId:productId,
            userId:userId,
            rating:rating,
            reviewText:reviewText
        });
        await newReview.save();
        res.status(200).json({ success: true, message: 'Review submitted successfully' });
    }catch(error){
        console.log(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}


module.exports = {
    loadProduct,
    LoadIndIvidualProduct,
    loadProductFilter,
    productFilterPopularity,
    searchProduct,
    sendReview
}