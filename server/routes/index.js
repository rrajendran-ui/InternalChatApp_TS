const express = require('express')
const registerUser = require('../controller/registerUser')
const checkEmail = require('../controller/checkEmail')
const checkPassword = require('../controller/checkPassword')
const userDetails = require('../controller/userDetails')
const logout = require('../controller/logout')
const updateUserDetails = require('../controller/updateUserDetails')
const searchUser = require('../controller/searchUser')
const {createConversation,addMembersToConversation} = require('../controller/conversation') 
const {forgotPassword, verifyOTP, resetPassword,} = require('../controller/forgotPassword')
const changePasswordController = require('../controller/changePassword')    
const router = express.Router()

//create user api
router.post('/register',registerUser)
//check user email
router.post('/email',checkEmail)
//check user password
router.post('/password',checkPassword)
//login user details
router.get('/user-details',userDetails)
//logout user
router.get('/logout',logout)
//update user details
router.post('/update-user',updateUserDetails)
//search user
router.post("/search-user",searchUser)
//create conversation
router.post("/conversations", createConversation)
//forgot password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
//change password
router.post("/change-password", changePasswordController);
//add members to conversation
router.put("/conversations/:id/add-members", addMembersToConversation);
module.exports = router