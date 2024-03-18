const mongoose = require('mongoose')


const userSchema = mongoose.Schema({
    firstname:{
        type:String,
        required:true  
    },
    lastname:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{
       type:String,
       required:true,
       unique:true
    },
    mobile:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
    },
    is_admin:{
       type:Number,
       required:true
    },
    is_verified:{
        type:Number,
        default:0
    },
    token:{
        type:String,
        default:''
    },
    address: [{
        street:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required: true
        },
        country:{
            type:String,
            required: true
        },
        postalCode:{
            type:String,
            required:true
        },
        type:{
            type:String,
            default:'home'
        }
    }],
    refCode:{
        type:String,
        unique:true
    },
    referedBy:{
        type:String,
    }
});

module.exports = mongoose.model('User',userSchema);