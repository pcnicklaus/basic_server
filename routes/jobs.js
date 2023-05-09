const express = require('express');
const router = express.Router();

// importing jobs controller metods

const { 
    getJob,
    getJobs,
    getJobsInRadius,
    newJob,
    updateJob,
    jobStats,
    deleteJob
} = require('../controllers/jobsController');

router.route('/jobs').get(getJobs);
router.route('/jobs/:zipcode/:distance').get(getJobsInRadius);
router.route('/stats/:topic').get(jobStats);

router.route('/job/new').post(newJob);

router.route('/job/:id/:slug').get(getJob);
router.route('/job/:id')
    .put(updateJob)
    .delete(deleteJob);


module.exports = router;