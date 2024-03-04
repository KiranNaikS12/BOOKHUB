const express = require('express');
const session = require('express-session')
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('express-flash')
const multer = require('multer')
const productController = require('../controller/productController');
const auth = require('../middleware/adminauth')
const product_route = express();
product_route.use(flash());
const config = require('../config/config');

product_route.use(
    session({
      secret: config.config.secretKey,
      resave: false,
      saveUninitialized: false,
    })
  );


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


product_route.get('/add',auth.isAdminLogin,productController.loadProductPage);
product_route.post('/add',upload,productController.insertProduct);
product_route.get('/lists',auth.isAdminLogin,productController.LoadProductList);
product_route.get('/edit',auth.isAdminLogin,productController.loadEditProductDetails);
product_route.post('/edit',upload,productController.loadUpdateProductDetails);
product_route.get('/delete',auth.isAdminLogin,productController.loadDeleteProduct);
product_route.get('/bin',auth.isAdminLogin,productController.LoadDeleteHistory);
product_route.get('/restore',auth.isAdminLogin,productController.restoreDeleteProduct);
product_route.get('/draft',auth.isAdminLogin,productController.loadSaveDraft);
product_route.get('/publish',auth.isAdminLogin,productController.loadPublishData)

module.exports = {
    product_route
}

