const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Wishlist = require('../models/wishlistModel');


const loadCategoryPage = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 6;
        const startIndex = (page - 1) * perPage;
        const categoryName = req.query.category;
        const userData = await User.findById(req.session.user_id);
        const categoryData = await Category.find({ status: 'active' });
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).send('Category not found');
        }
        
        const products = await Product.find({ category: categoryName,status:{$ne:'inactive'} }).skip(startIndex).limit(perPage);
        const cartData = await Cart.findOne({ owner: userData }).populate('items.productId');
        let cartItemCount = 0;
        if (cartData && cartData.items) {
            cartItemCount = cartData.items.length;
        }
        const wishlist = await Wishlist.findOne({ user: userData });
        const wishlistCount = wishlist ? wishlist.items.length : 0;
        res.render('user-category', {
            product: products,
            user: userData,
            cartItemCount: cartItemCount,
            category: categoryData,
            categoryname: categoryName,
            currentPage: page,
            wishlistCount:wishlistCount,
            totalPages: Math.ceil(await Product.countDocuments({ category: categoryName, status: { $ne: 'inactive' } })/perPage)
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};


const filterProducts = async (req, res) => {
    try {
        const categoryName = req.query.category;
        const sortBy = req.query.sortBy;
        let productData;

        let baseQuery = { status: { $ne: 'inactive' } };

        if (categoryName) {
            baseQuery.category = categoryName;
        }

        if (sortBy === 'lowToHigh') {
            productData = await Product.find(baseQuery).sort({ afterDiscount: 1 });
        } else if (sortBy === 'highToLow') {
            productData = await Product.find(baseQuery).sort({ afterDiscount: -1 });
        } else if (sortBy === 'averageRating') {
            productData = await Product.aggregate([
                { $match: baseQuery },
                {
                    $lookup: {
                        from: 'reviews',
                        localField: '_id',
                        foreignField: 'productId',
                        as: 'ratings'
                    }
                },
                {
                    $addFields: {
                        averageRating: { $avg: '$ratings.rating' }
                    }
                },
                { $sort: { averageRating: -1 } }
            ]);
            
        } else {
            productData = await Product.find(baseQuery);
        }

        res.json(productData);
    } catch (error) {
        console.log('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const filterPopularity = async(req,res) => {
    try{
        console.log('start')
        const categoryName = req.query.category;
        const showBy = req.query.showBy;
        let productPopularity;
        console.log('started')
        const baseQuery = { category: categoryName, status: { $ne: 'inactive' } };
        if (showBy === 'Trending'){
            productPopularity = await Product.find(baseQuery).sort({views:-1});
            // console.log('trending',productPopularity)
        }else if(showBy === 'NewArrivals'){
            productPopularity = await Product.find(baseQuery).sort({ updated_at: 1 })
        }else if(showBy === 'AZ'){
            productPopularity = await Product.find(baseQuery).sort({ title: 1 });
        }else if(showBy === 'ZA'){
            productPopularity = await Product.find(baseQuery).sort({title:-1});

        }else{
            productPopularity = await Product.find(baseQuery);
        }

        res.json(productPopularity);

    }catch(error){
        console.log('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const loadDistinctCategory = async(req,res) => {
    try{
        const categoryName = req.query.category;
        const products = await Product.find({category:categoryName})
        res.json(products);
    }catch(error){
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
}


module.exports = {
    loadCategoryPage,
    filterProducts,
    filterPopularity,
    loadDistinctCategory
}