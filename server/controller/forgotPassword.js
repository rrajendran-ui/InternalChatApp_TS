const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");

let otpStore = {}; // use DB/Redis in production

// Send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = otp;

    console.log(`OTP for ${email}: ${otp}`);

    // send email logic here

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
// STEP 2
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  console.log('OTP111 for ', email, otp);
  if (otpStore[email] == otp) {
    res.status(200).json({
      success: true,
      message: "OTP verified",
    });    
  }
  else {
   res.status(400).json({
    success: false,
    message: "Invalid OTP",
  });

}
   
};
// Reset password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (otpStore[email] != otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.updateOne(
      { email },
      { password: hashedPassword }
    );

    delete otpStore[email];

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  forgotPassword,
  verifyOTP,
  resetPassword,
};