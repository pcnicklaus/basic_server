const User = require('../models/user');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// register a new user => /api/v1/register
exports.registerUser = catchAsyncErrors( async (req, res, next) => {
    const { name, email, password, role } = req.body;

    const user = await User.create({
        name,
        email,
        password,
        role
    });

    sendToken(user, 200, res);
});

// login user -> /api/v1/login
exports.loginUser = catchAsyncErrors( async (req, res, next) => {
    const { email, password } = req.body;

    // confirm values present
    if(!email || !password) {
        return next( new ErrorHandler('Please enter email & password'), 400);
    }

    const user = await User.findOne({email}).select('+password');

    if(!user) {
        return next( new ErrorHandler('hmmmm... either your email or password does not look right...'), 400);   
    }

    // check if password is correct
    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched) {
        return next( new ErrorHandler('yo... something funk with your email or password'), 400);    
    }

    sendToken(user, 200, res);
});

// forgot password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors( async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    // check if user is in db
    if(!user) {
        return next( new ErrorHandler('no user found with this email'), 404);    
    }

    // get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // create reset password url
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

    const message = `Your password reset link is here:\n\n${resetURL}\n\n ignore if you did not request tis`

    console.log('resetURL', resetURL, '\n message', message)

    try {
        
        await sendEmail({
            email: user.email,
            subject: 'Jobee Email Recovery',
            message
        });
    
        res.status(200).json({
            success: true,
            message: `Email sent successfully to: ${user.email}`
        });

    } catch (error) {

        console.log('error------', error)
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return next( new ErrorHandler('Email not sent'), 500);    

    }
   
});

// Reset password =>  /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors( async(req, res, next) => {
    // hash url token
    const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

    const user = await User.findOne({ 
        resetPasswordToken, 
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next( new ErrorHandler('Password reset token is invalid'), 400);    
    }

    // setup new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save()

    sendToken(user, 200, res);
});

//LOGOUT user
exports.logout = catchAsyncErrors( async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logout successful'
    })
})