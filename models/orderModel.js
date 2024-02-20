const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const objectID = mongoose.Schema.Types.ObjectId;

const orderSchema = mongoose.Schema({
    user: {
        type: ObjectId,
        ref:'User',
        required: true
    },
    cart:{
        type: ObjectId,
        ref:'Cart'
    },

    items:[{
        productId:{
            type:objectID,
            ref:'Book'
        },
        image: [{
            type: String,
            required: true
        }],
        productPrice:{
            type:Number,
            required:true
        },
        quantity:{
            type:Number,
            required:true,
            min:[1,'Quantity can not be less than one.'],
            default:1
        },
        price:{
            type:Number,
            required:true
        },
    }],
    billTotal:{
        type:Number,
        required:true
    },
    
},{
    timeStamp: true
});

module.exports = mongoose.model('Order',orderSchema);