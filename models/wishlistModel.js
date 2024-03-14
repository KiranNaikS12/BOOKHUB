const mongoose = require('mongoose');
const objectID = mongoose.Schema.Types.ObjectId;

const wishlistSchema = mongoose.Schema({
    user:{
        type:objectID,
        required:true,
        ref:'User'
    },
    items:[{
       productId:{
        type:objectID,
        required:true,
        ref:'Book'
       } 
    }],
    status:{
        type:String,
        enum:['added','not-added'],
        default:'added'
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Wishlist',wishlistSchema);