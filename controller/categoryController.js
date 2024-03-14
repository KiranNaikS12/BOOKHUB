const Category = require('../models/categoryModel');
const { body, validationResult } = require('express-validator');
// *******LoadCategoryPage************
const loadCategorypage = async(req,res) => {
    try{
        const currentPage = parseInt(req.query.page) || 1;
        const perPage = 6;
        const startIndex = (currentPage - 1) * perPage;
        const categoryData = await Category.find({deleted_at:null}).skip(startIndex).limit(perPage);

        const categoryCount = await Category.countDocuments({deleted_at:null});
        const totalPages = Math.ceil(categoryCount / perPage);
        res.render('admin-category-page',{
            category:categoryData,
            totalPages:totalPages,
            currentPage:currentPage
        })
    }catch(error){
        console.log(error.message)
    }
}

// *******InsertCategoryPage************
const insertCategory = async(req,res) => {
    try{
         const nameRegex = '^[^\p{L}]{0,20}$'
         const validationRules = [
            body('name').notEmpty().withMessage('Category name is required'),
            body('description').notEmpty().withMessage('description cannot be empty')
         ];
         await Promise.all(validationRules.map(validation => validation.run(req)));
         const errors = validationResult(req);
         if(!errors.isEmpty()){
            return res.render('admin-category-page',{errorMessage:errors.array()[0].msg, category: []})
         }else{
            const {name,description} = req.body;
            const categoryExists = await Category.findOne({name});
            if(categoryExists){
                res.render('admin-category-page', { errorMessage: 'category already exists', category: [] });
            }else{
                const category = new Category({
                    name,
                    description,
                    is_published:1
                })
                const categoryData = await category.save();
                if(categoryData){        
                    res.redirect('/admin/category')
            }else{
                res.render('admin-category-page',{errorMessage:'Something went wrong'})
            }
        }
    }
    }catch(error){
        console.log(error.message)
    }
}

//*********LoadCategoryDetails************* */
const loadEditCategoryDetails = async(req,res) => {
    try{
        const id = req.query.id;
        // console.log('ID from query:', id);
        const categoryData = await Category.findById({_id:id});
        if(categoryData){
            res.render('category-edit', {category:categoryData})
        }else{
            res.redirect('/admin/category/')
        }

    }catch(error){
        console.log(error.message)
    }
}

//*********UpdateCategoryDetails************* */
const updateCategoryLoad = async(req,res) => {
    try{  
        const categoryData = await Category.findByIdAndUpdate({_id:req.body.category_id},{$set:{name:req.body.name,description:req.body.description,status:req.body.status}});
        res.redirect('/admin/category/');
    }catch(error){
        console.log(error.message)
    }
}

//*********deleteCategoryDetails************* */
const loadDeleteCategory= async(req,res) => {
    try{
        const id = req.query.id;
        await Category.findByIdAndUpdate(
            id,
            {$set:{
                deleted_at: new Date(),
                status: 'delete'
            }
            },
            {new: true}
            )
        res.redirect('/admin/category/');
    }catch(error){
        console.log(error.message);
    }
}

//*********LoadCategoryBin************* */
const loadCategoryBin = async(req,res) => {
    try{
        const categoryData = await Category.find({status:'delete'});
        if(categoryData){
            res.render('category-bin',{category:categoryData})
        }
    }catch(error){
        console.log(error.message);
    }
}

//*********restoreCategoryDetail************* */
const restoreCategory = async(req,res) => {
    try{
        const id = req.query.id;
        const categoryData = await Category.findByIdAndUpdate(
            id,
            {$set:{
                deleted_at:null,
                status:'active'
            }},
            {new:true}
        )
        if(categoryData){
            res.redirect('/admin/category/');
        }
    }catch(error){
        console.log(error.message)
    }
}

module.exports = {
    loadCategorypage,
    insertCategory,
    loadEditCategoryDetails,
    updateCategoryLoad,
    loadDeleteCategory,
    loadCategoryBin,
    restoreCategory
}