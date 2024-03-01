const Product = require('../models/productModel');
const { body, validationResult } = require('express-validator');
const Category = require('../models/categoryModel');
const mongoose = require("mongoose");


// *******LoadProductPage************
const loadProductPage = async(req,res) => {
    try{
        const category = await Category.find();
        const product = await Product.find();
            res.render('product-page',{category:category,product:product});
    }catch(error){
        console.log(error.message)
    }
}

// *******InsertProductPage************
const insertProduct = async(req,res) => {
    try{
        const ISBNRegex = /^\d{13}$/;
        const validationRules = [
            body('title').notEmpty().withMessage('Product title is required'),
            body('author').notEmpty().withMessage('Author is required'),
            body('ISBN').notEmpty().withMessage('ISBN code is required'),
            body('ISBN').matches(ISBNRegex).withMessage('Invalid!. ISBN should have 13 digits'),
            body('description').notEmpty().withMessage('description is required'),
            body('price').notEmpty().withMessage('price is required'),
            body('category').notEmpty().withMessage('Category is required')
        ];
        await Promise.all(validationRules.map(validate => validate.run(req)));
        const errors = validationResult(req)
        if(!errors.isEmpty()){
             res.render('product-page', {errorMessage:errors.array()[0].msg, category: req.body.category })
        }else{           
            const {title,author,ISBN,description,price,countInStock,discountPrice} = req.body;
            const category = mongoose.Types.ObjectId(req.body.category);
            const existingProduct = await Product.findOne({$or:[{title},{ISBN}]});
            if(existingProduct){
                const errorMessage = existingProduct.title === title ? 'Product title is already exists' : 'ISBN code is already exists';
                return res.render('product-page',{errorMessage,category: req.body.category });
            }else{
                const images = req.files.map(file => file.filename);
                const isPublished = req.body.action === 'publish' ? 1 : 0 // Check the action value to determine if it's a publish or draft
                const product = await Product({
                    title,
                    author,
                    ISBN,
                    category,
                    description,
                    images,
                    price,
                    countInStock,
                    is_published:isPublished,
                    status: isPublished ? 'active' : 'Draft',
                    discountPrice,
                    views:0,
                    afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100)))             
                }) 
                if(product.images.length >= 5){
                    return res.render('product-page',{errorMessage:'You cannot upload more than 5 photos',category:category})
                }
                const productData = await product.save();
                if(productData){
                   const successMessage = isPublished ? 'Product is published successfully' : 'Product is successfully drafted'
                   return res.render('product-page',{successMessage,category:category})
                 }else{
                   return res.render('registration',{errorMessage:'Something went wrong'})
                 }
            }
            }           
    }catch(error){
        console.log(error.message);
    }
}

// *******LoadProductList************
const LoadProductList = async(req,res) => {
    try{
        const product = await Product.find({deleted_at:null,is_published:1})
        if(product){
            res.render('view-product-page',{product})
        }
    }catch(error){
        console.log(error.message)
    }
}

// *********EditProductDetails**********
const loadEditProductDetails = async(req,res) => {
    try{
        const category = await Category.find({status:'active'});
        const id = req.query.id;
        const productData = await Product.findById({_id:id});
        if(productData){
            res.render('product-edit', {product:productData,category:category})
        }else{
            res.redirect('/admin/product/list')
        }
    }catch(error){
        console.log(error.message)
    }
}

// *********EditProductDetails**********
const loadUpdateProductDetails = async (req, res) => {
    try {
        const id = req.body.product_id;
        const existingProduct = await Product.findById({_id:id});
        const categoryData = await Category.find({status:'active'});
        let existingImages = [];
        let removedImages = req.body.remove_image || [];
        if( existingProduct && existingProduct.images && Array.isArray(existingProduct.images)){
            existingImages = existingProduct.images;
        }

        const updatedImages = existingImages.filter(image => !removedImages.includes(image));

        let newImages = req.files.map((file) => file.filename);

        updatedImages.push(...newImages);
        if (newImages.length > 0) {
            if (updatedImages.length > 4) {
                const productData = await Product.findById({ _id: id });
                return res.render('product-edit', { errorMessage: 'You cannot upload more than 4 images', product: productData,category:categoryData });
            }
        }
        const { title, author, description, ISBN, price, category, status, countInStock, discountPrice } = req.body;
        const productData = await Product.findByIdAndUpdate(id, {
            $set: {
                title,
                author,
                description,
                ISBN,
                images: updatedImages,
                price,
                category,
                status,
                countInStock,
                discountPrice,
                afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100))),
                updated_at: new Date()
            }
        });
        if (productData) {
            res.redirect('/admin/product/list');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


// *********DeleteProductDetails**********
async function loadDeleteProduct(req, res) {
    try {
        const id = req.query.id;
        await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    deleted_at: new Date(),
                    status: 'deleted'
                }
            },
            { new: true }
        );
        res.redirect('/admin/product/list');
    } catch (error) {
        console.log(error.message);
    }
}

// *********LoadDeleteHistory**********
const LoadDeleteHistory = async (req, res) => {
    try {
        const deletedProducts = await Product.find({ status: 'deleted' });
        res.render('product-bin', { product: deletedProducts });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// *********RestoreDeleteProduct**********
const restoreDeleteProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const productData = await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    deleted_at: null,
                    status: 'active' 
                }
            },
            { new: true } 
        );

        if (productData) {
            res.redirect('/admin/product/list');
        } else {
            res.redirect('view-product-page')
        }
    } catch (error) {
        console.error(error.message);
    }
};

// ********LoadsaveDraft***********
const loadSaveDraft = async (req,res) => {
    try{ 
        const productData = await Product.find({status:'Draft'})
        if(productData){
            res.render('product-draft',{product:productData})
        }
    }catch(error){
        console.log(error.message)
    }
}

// ********loadPublishData***********
const loadPublishData = async(req,res) => {
    try{
        const id = req.query.id;
        const productData = await Product.findByIdAndUpdate(
            id,
            {
                $set:{
                    status:'active',
                    is_published:1
                }
            },
            {new:true}
        )
        if (productData) {
            res.redirect('/admin/product/list');
        }      
    }catch(error){
      console.log(error.message)
    }
}


module.exports = {
    loadProductPage,
    insertProduct,
    LoadProductList,
    loadEditProductDetails,
    loadUpdateProductDetails,
    loadDeleteProduct,
    LoadDeleteHistory,
    restoreDeleteProduct,
    loadSaveDraft,
    loadPublishData
}