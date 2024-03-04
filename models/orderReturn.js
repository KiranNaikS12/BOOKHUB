const mongoose = require('mongoose');
const objectID = mongoose.Schema.Types.ObjectId;

const returnScehma = mongoose.Schema({
    user:{
        type:objectID,
        required:true,
        ref:'User'
    },
    orderId: {
        type:objectID,
        required:true,
        ref:'Order'
    },
    reason:{
        type:String,
        required:true
     },
     returnStatus:{
         type:String,
         enum:['Initiated', 'Processing', 'Accepted','Declined'],
         default:'Initiated'
     },
},{
    timestamps:true,
})

module.exports = mongoose.model('Return',returnScehma);