const express = require('express' );
const router = express.Router( );

const { 
    getUserProfile,
    getAllAppliedJobs,
    getAllCreatedJobs,
    updatePassword,
    updateUser,
    deleteUser,
    adminGetUsers,
    adminDeleteUser
} = require('../controllers/userController' );

const { isAuthenticatedUser, authorizedRoles } = require('../middlewares/auth');

router.use(isAuthenticatedUser)

router.route('/me').get( getUserProfile );
router.route('/me/update').put( updateUser );
router.route('/me/delete').delete( deleteUser );

router.route('/jobs/applied').get( authorizedRoles('user'), getAllAppliedJobs );
router.route('/jobs/published').get( authorizedRoles('employer'), getAllCreatedJobs );

router.route('/password/change').put( updatePassword );

// ADMIN ONLY ROUTES
router.route('/users').get( authorizedRoles('admin'), adminGetUsers );
router.route('/users/:id').delete( authorizedRoles('admin'), adminDeleteUser );


module.exports = router;