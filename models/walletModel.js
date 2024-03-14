const mongoose = require('mongoose');
const objectID = mongoose.Schema.Types.ObjectId;

const walletSchema = mongoose.Schema({
    user:{
        type:objectID,
        ref:'User',
        required:true
    },
    walletBalance:{
        type:Number,
        default:0
    },
    amountSpent:{
        type:Number,
        default:0
    },
    refundAmount:{
        type:Number,
        default:0
    }
},{
    timestamp:true
});

module.exports = mongoose.model('Wallet',walletSchema);