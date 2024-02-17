const mongoose = require('mongoose');


const categoryName = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive','delete'],
        default: 'active'
    },
    is_published:{
        type:Number,
        default:0
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    deleted_at:{
        type:Date,
        default:null
    }
});

module.exports = mongoose.model('Category',categoryName)