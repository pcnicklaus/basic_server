const Job = require('../models/job');
const geoCoder = require('../utils/geocoder');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const APIFilters = require('../utils/filters');
const path = require('path');
const fs = require('fs');

// Get all jobs => /api/v1/jobs
exports.getJobs = catchAsyncErrors (async (req, res, next) => {

    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .pagination();

    const jobs = await apiFilters.query.populate({
        path: 'user',
        select: 'name'
    });

    res.status(200).json({
        success: true,
        message: "this route will display jobs",
        data: jobs
    });
});


// create a new job =>  api/v1/job/new

exports.newJob = catchAsyncErrors (async (req, res, next) => {

    // adding user to body
    req.body.user = req.user.id;

    const job = await Job.create(req.body);

    res.status(200).json({
        success: true,
        message: 'Job created',
        data: job
    });
});

// update a job => api/vi/job/:id
exports.updateJob = catchAsyncErrors (async (req, res, next) => {

    let job = await Job.findById(req.params.id);

    if(!job) {
        return next(new ErrorHandler('Job not found.', 404));
    }

    // check if user is owner
    if(job.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next( new ErrorHandler(`User ${req.user.id} is not allowed to update the job`))
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: 'Job is updated',
        data: job
    });
});

// get one job by id or slug => 
exports.getJob = catchAsyncErrors (async (req, res, next) => {

    console.log('req.params', req.params);

    const job = await Job.find({
        $and: [{ _id: req.params.id }, { slug: req.params.slug }]
    }).populate({
        path: 'user',
        select: 'name'
    });

    console.log("job", job)

    if(!job || job.length === 0) {
        return next(new ErrorHandler('Job not found.', 404));
    }

    res.status(200).json({
        success: true,
        data: job
    });
});


// search jobs by radius => api/vq/jobs/:zipcode/:distance
exports.getJobsInRadius = catchAsyncErrors (async (req, res, next) => {
    const { zipcode, distance } = req.params;

    // get lat / lon from geocoder with zipcode
    const loc = await geoCoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    const radius = distance / 3963;

    const jobs = await Job.find({
        location: { $geoWithin: { $centerSphere: [[ longitude, latitude ], radius] } }
    });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    })
});
// delete a job => api/v1/job/:id
exports.deleteJob = catchAsyncErrors (async (req, res, next) => {

    let job = await Job.findById(req.params.id).select('+applicantApplied');

    if(!job) {
        return next(new ErrorHandler('Job not found.', 404));
    }

     // check if user is owner
     if(job.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next( new ErrorHandler(`User ${req.user.id} is not allowed to update the job`))
    }


    for( let i = 0; i < job.applicantApplied.length; i++ ) {
        let filepath = `${__dirname}/public/uploads/${job.applicantApplied[i].resume}`.replace('\\controllers', '');

        fs.unlink(filepath, error => {
            if(error) return console.log(error);
        })
    }

    job = await job.remove;

    res.status(200).json({
        success: true,
        message: 'Job is deleted'
    })

});

/*
    get stats about a topic => /api/v1/stats/:topic
    NOTE to do the AGGREGATION down in der we had to add an index thru the mongo terminal
    mongosh
    use jobs 
    db.jobs.createIndex({title: "text"});

*/
exports.jobStats = catchAsyncErrors (async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match: {$text: {$search: "\"" + req.params.topic + "\""}}
        },
        {
            $group: {
                _id: {$toUpper: '$experience'},
                totalJobs: {$sum: 1},
                avgPosition: {$avg: '$positions'},
                avgSalary: {$avg: '$salary'},
                minSalary: {$min: '$salary'},
                maxSalary: {$max: '$salary'}
            }
        }
    ]);

    if(stats.length === 0) {
        return next(new ErrorHandler(`No stats found for topic ${req.params.topic}`, 200));
    }

    res.status(200).json({
        success: true,
        data: stats
    });
});

// apply to job using Resume ----  /api/v1/job/:id/apply
exports.applyJob = catchAsyncErrors( async (req, res, next) => {
    let job = await Job.findById(req.params.id).select('+applicantApplied');

    if(!job) {
        return next( new ErrorHandler('Job not found.', 404));
    }

    // check if job has expired
    if (job.lastDate < new Date(Date.now())) {
        return next( new ErrorHandler('Application period is closed', 400));
    }

    // check if user previously applied to job
    // check if user has already applied
    if(job.applicantApplied.length > 0) {
        for(let i = 0; i <= job.applicantApplied.length; i++) {
            if(job.applicantApplied[i].id === req.user.id) {
                return next( new ErrorHandler('You already applied, you cannot apply again', 400));
            }
        }
    }
   

    // check to make sure file is present
    if(!req.files) {
        return next( new ErrorHandler('Please upload file', 400));
    }

    const file = req.files.file;

    

    // check the file type
    const supportedFiles = /.docx|.pdf/;
    if(!supportedFiles.test(path.extname(file.name))) {
        return next( new ErrorHandler('Please upload a .pdf or .docs file', 400));
    }

    // check document size
    if(file.size > process.env.MAX_FILE_SIZE) {
        return next( new ErrorHandler('Only files < 2mb are allowed', 400));

    }

    // renaming the file/resume
    file.name = `${req.user.name.replace(' ', '_')}_${job._id}_${path.parse(file.name).ext}`;

    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async (err) => {
        if(err) {
            console.log(err)
            return next( new ErrorHandler('something went wrong with resume upload', 404));
        }

        await Job.findByIdAndUpdate(req.params.id, { $push: {
            applicantApplied: {
                id: req.user.id,
                resume: file.name
            }
        }}, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        res.status(200).json({
            success: true,
            message: 'Applied successfully',
            data: file.name
        });
    })

})