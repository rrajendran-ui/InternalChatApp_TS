const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");
//const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken")

const changePasswordController = async (req, res) => {
  try {
    // const token = request.cookies.token || ""    
    // const user = await getUserDetailsFromToken(token)
    
    //console.log('UserID in change password: ', userId);
    const { currentPassword, newPassword, _id } = req.body;
    const userId = _id;
    // if(1===1){
    // return res.status(400).json({
    //     message: userId,
    //   });
    // }
    const userexist = await UserModel.findById(userId);

    if (!userexist) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      userexist.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      newPassword,
      salt
    );

    userexist.password = hashedPassword;
    await UserModel.updateOne({ _id : userId },{
                password: hashedPassword 
            })

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = changePasswordController;