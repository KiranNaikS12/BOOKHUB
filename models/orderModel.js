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
    oId:{
       type:String,
       required:true
    },
    orderStatus:{
        type:String,
        enum:['Pending','Confirmed','Shipped','Delivered','Cancelled','Deleted','Returned'],
        default:'Pending',
    },
    items:[{
        productId:{
            type:objectID,
            ref:'Book'
        },
        title:{
            type: String,
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
        quantity:{
            type:Number,
            required:true,
            min:[1,'Quantity can not be less than one.'],
            default:1
        },
        price:{
            type:Number,
        },
    }],
    billTotal:{
        type:Number,
        required:true
    },
    additionalMobile: {
        type: String,
        default: '' 
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
    },
    paymentMethod: {
        type: String,
        required:true
      },
      paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failed'],
        default: 'Pending',
      },
      orderDate: {
        type: Date,
        default: Date.now,
      },
      orderNotes: {
        type: String,
        default:''
    },
    cancellationReason:{
        type: String,
        default: ''
    },
},{
    timestamps: true,
});

module.exports = mongoose.model('Order',orderSchema);

