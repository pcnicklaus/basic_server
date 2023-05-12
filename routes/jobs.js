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
    deleteJob,
    applyJob
} = require('../controllers/jobsController');

const { isAuthenticatedUser, authorizedRoles } = require('../middlewares/auth');

router.route('/job/:id/apply').put(isAuthenticatedUser, applyJob)

router.route('/jobs').get(getJobs);
router.route('/jobs/:zipcode/:distance').get(getJobsInRadius);
router.route('/stats/:topic').get(jobStats);

router.route('/job/new').post(isAuthenticatedUser, authorizedRoles('employer', 'admin'), newJob);

router.route('/job/:id/:slug').get(getJob);
router.route('/job/:id')
    .put(isAuthenticatedUser, updateJob)
    .delete(isAuthenticatedUser, deleteJob);


module.exports = router;