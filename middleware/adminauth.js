const isAdminLogin = async(req,res,next) => {
    try{
         if(req.session.admin_id){
            next()
         }else{
            res.redirect('/admin/')
         }
    }catch(error){
        console.log(error.message)
    }
}

const isAdminLogout = async(req,res,next) => {
    try{
        if(req.session.admin_id){
            return res.redirect('/admin/home')
        }
        next();
    } catch(error){
        console.log(error.message)
    }
}


module.exports = {
    isAdminLogin,
    isAdminLogout,
}
