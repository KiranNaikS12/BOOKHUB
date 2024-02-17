const express = require('express');
const session = require('express-session')
const config = require('../config/config');
const bodyParser = require('body-parser')
const categroyController = require('../controller/categoryController')
const cat_route = express();

cat_route.use(session({
    secret:config.config.secretKey,
    resave:false,
    saveUninitialized:false
}));

cat_route.use(bodyParser.json());
cat_route.use(bodyParser.urlencoded({extended:true}));
cat_route.set('view engine','ejs');
cat_route.set('views','./views/category');

cat_route.use(express.static('public'));


cat_route.get('/',categroyController.loadCategorypage);
cat_route.post('/',categroyController.insertCategory);
cat_route.get('/update',categroyController.loadEditCategoryDetails);
cat_route.post('/update',categroyController.updateCategoryLoad);
cat_route.get('/delete',categroyController.loadDeleteCategory)
cat_route.get('/bin',categroyController.loadCategoryBin);
cat_route.get('/restore',categroyController.restoreCategory)

module.exports = {
    cat_route
}
