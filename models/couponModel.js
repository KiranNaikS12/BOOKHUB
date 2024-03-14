const mongoose = require('mongoose')

const couponSchema = mongoose.Schema({
    name:{
        type:String,
        require:true,
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    minimumAmount:{
        type:Number,
        required:true
    },
    maximumAmount:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        require:true
    },
    couponCode:{
        type:String,
        required:true
    },
    isActive:{
        type:String,
        default:1
    },
    users:{
        type:Array,
    },
    status:{
        type:String,
        default:'Active'
    }
},{
    timestamp:true
});

module.exports = mongoose.model('Coupon',couponSchema);