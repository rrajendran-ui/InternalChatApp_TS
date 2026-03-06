const jwt = require('jsonwebtoken')
const UserModel = require('../models/UserModel')

const getUserDetailsFromToken = async(token)=>{
    
    if(!token){
        return {
            message : "session out",
            logout : true,
        }
    }

    try{

        const decode = await jwt.verify(token,process.env.JWT_SECREAT_KEY)

        const user = await UserModel.findById(decode.id).select('-password')

        return user
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return { error: "TOKEN_EXPIRED" };
        }

        return { error: "INVALID_TOKEN" };
    }
}

module.exports = getUserDetailsFromToken