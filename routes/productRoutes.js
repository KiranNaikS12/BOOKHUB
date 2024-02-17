const express = require('express');
const session = require('express-session')
const config = require('../config/config');
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('express-flash')
const multer = require('multer')
const productController = require('../controller/productController');
const product_route = express();
product_route.use(flash());


product_route.use(session({
    secret:config.config.secretKey,
    resave:false,
    saveUninitialized:false
}));

product_route.use(bodyParser.json());
product_route.use(bodyParser.urlencoded({extended:true}));
product_route.set('view engine','ejs');
product_route.set('views','./views/product');
product_route.use(express.static('public'));

const storage = multer.diskStorage({
    destination:function(req,res,cb){
        cb(null,path.join(__dirname,'../public/assets-admin/productImages'))
    },
    filename: function(req,file,cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
})
const upload = multer({storage:storage}).array('images');
// const upload = multer({ storage: storage }).fields([{ name: 'images', maxCount: 10 }]);


product_route.get('/add',productController.loadProductPage);
product_route.post('/add',upload,productController.insertProduct);
product_route.get('/list',productController.LoadProductList);
product_route.get('/update',productController.loadEditProductDetails);
product_route.post('/update',upload,productController.loadUpdateProductDetails);
product_route.get('/delete',productController.loadDeleteProduct);
product_route.get('/bin',productController.LoadDeleteHistory);
product_route.get('/restore',productController.restoreDeleteProduct);
product_route.get('/draft', productController.loadSaveDraft);
product_route.get('/publish',productController.loadPublishData)

module.exports = {
    product_route
}

