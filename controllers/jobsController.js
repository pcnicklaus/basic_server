const Job = require('../models/job');
const geoCoder = require('../utils/geocoder');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const APIFilters = require('../utils/filters')

// Get all jobs => /api/v1/jobs
exports.getJobs = catchAsyncErrors (async (req, res, next) => {

    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .pagination();

    const jobs = await apiFilters.query;

    res.status(200).json({
        success: true,
        message: "this route will display jobs",
        data: jobs
    });
});


// create a new job =>  api/v1/job/new

exports.newJob = catchAsyncErrors (async (req, res, next) => {

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

    let job = await Job.findById(req.params.id);

    if(!job) {
        return next(new ErrorHandler('Job not found.', 404));
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