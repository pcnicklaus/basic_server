const User = require('../models/user');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const Job = require('../models/job');
const fs = require('fs');
const APIFilters = require('../utils/filters');


// get user profile - /api/v1/me
exports.getUserProfile = catchAsyncErrors( async (req, res, next) => {
    
    const userData = await User.findById(req.user.id)
            .populate({
                path: 'jobsPublished',
                select: 'title postingDate'
            });

    res.status(200).json({
        success: true,
        data: userData
    })
});

// update password =--- /api/v1/password/update
exports.updatePassword = catchAsyncErrors( async (req, res, next) => {

    const user = await User.findById(req.user.id).select('+password');

    // check password
    const isMatched = await user.comparePassword(req.body.currentPassword);
    if(!isMatched) {
        return next( new ErrorHandler('Old password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendToken(user, 200, res);
});

// update user data ----- /api/v1/me/update
exports.updateUser = catchAsyncErrors( async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email
    }
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    res.status(200).json({
        success: true,
        data: user
    })
});

// show all applied jobs for a user = api/v1/jobs/applied
exports.getAllAppliedJobs = catchAsyncErrors( async (req, res, next) => {
    const jobs = await Job.find({ 'applicantApplied.id': req.user.id}).select('+applicantApplied')

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    })
})

// show all jobs created by an employer 
exports.getAllCreatedJobs = catchAsyncErrors( async (req, res, next) => {
    const jobs = await Job.find({ user: req.user.id})

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});



// DELETE current user /me/delete
exports.deleteUser = catchAsyncErrors( async (req, res, next) => {
    
    deleteUserData(req.user.id, req.user.role);
    
    const user = await User.findByIdAndDelete(req.user.id);

    res.cookie('token', 'none', {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Your account has been deleted'
    })
})

async function deleteUserData(user, role) {
    if(role === 'employer') {
        await Job.deleteMany({ user: user });
    }

    if(role === 'user') {
        const appliedJobs = await Job.find({ 'applicantApplied.id': req.user.id}).select('+applicantApplied');

        for(let i = 0; i < appliedJobs.length; i++) {
            // should it be just `user` at the end not `user.id`
            let obj = appliedJobs[i].applicantApplied.find( o => o.id === user.id);

            console.log('dirname', __dirname)
            let filepath = `${__dirname}/public/uploads/${obj.resume}`.replace('\\controllers', '');

            fs.unlink(filepath, error => {
                if(error) return console.log(error);
            })

            appliedJobs[i].applicantApplied.splice(appliedJobs[i].applicantApplied.indexOf(obj.id));

            await appliedJobs[i].save();
        }
    }
}

// ADMIN CONTROLLER METHODS

// show all users => /api/v1/users
exports.adminGetUsers = catchAsyncErrors( async (req, res, next) => {
    const apiFilters = new APIFilters(User.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .pagination()

    const users = await apiFilters.query;

    res.status(200).json({
        success: true,
        results: users.length,
        data: users
    })
})

// delete user (ADMIN) = /api/v1/user/:id
exports.adminDeleteUser = catchAsyncErrors( async (req, res, next) => {
    let user = await User.findById(req.params.id);

    if(!user) {
        next ( new ErrorHandler(`user not found with id: ${req.params.id}`, 404));
    }

    deleteUserData(user.id, user.role);
    await user.remove;

    res.status(200).json({
        success: true,
        message: 'user was deleted.'
    });

})