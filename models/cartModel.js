const mongoose = require('mongoose');
const objectID = mongoose.Schema.Types.ObjectId;

const cartSchema = mongoose.Schema({
    owner: {
        type: objectID,
        required: true,
        ref: 'User'
    },

    items: [{
        productId: {
            type: objectID,
            required: true,
            ref: 'Book'
        },
        title:{
           type:String,
           required:true
        },
        image: [{
            type: String,
            required: true
        }],     
        productPrice:{
            type:Number,
            required:true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity cannot be less than 1.'],
            default: 1
        },
        price: {
            type:Number
          },
        productStatus: {
            type: String,
            enum: ['active','Limit-Exceeded'],
            default: 'active'
        },
        selected: {
            type: Boolean,
            default: false
        }
    }],
    billTotal: {
        type: Number,
        required: true,
        default: 0
    },
    discountedTotal:{
        type:Number,
        default:0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Cart',cartSchema);