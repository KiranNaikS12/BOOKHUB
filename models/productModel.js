const mongoose = require('mongoose');


const bookSchema = mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    author:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true,
    },
    images:[{
        type:String,
        required:true
    }],
    price:{
        type:Number,
        required:true
    },
    ISBN:{
        type:String,
        unique:true
    },
    category: {
        type: String, 
        required: true,
    },
    is_published:{
        type:Number,
        default:0
    },
    status: {
        type: String,
        enum: ['active', 'out-of-stock', 'inactive','deleted','Draft'],
        default: 'active'
    },
    countInStock:{
        type:Number,
        required:true,
        default:1
    },
    discountPrice:{
        type: Number,
        default: 0,
     },
    afterDiscount:Number,
    updated_at: {
        type: Date,
        default: Date.now
    },
    deleted_at:{
        type:Date,
        default: null
    },
    views:{
        type:Number,
        default:0
    }
});

module.exports = mongoose.model('Book',bookSchema)