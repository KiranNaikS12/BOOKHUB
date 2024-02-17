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
        selected: {
            type: Boolean,
            default: false
        }
    }],
    billTotal: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timeStamp: true
});

module.exports = mongoose.model('Cart',cartSchema);