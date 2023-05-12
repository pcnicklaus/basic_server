const express = require('express');
const app = express();

const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const connectDatabase = require('./config/database');
const errorMiddleware = require('./middlewares/errors');
const ErrorHandler = require('./utils/errorHandler');

// Setting up config.env vars
dotenv.config({ path: './config/config.env' });

// handling uncaught exception
// needs to be at the top to make sure it catches em all
process.on('uncaughtException', err => {
    console.log(`ERROR: ${err.message}`);
    console.log('Shutting down due to uncaught exception');
    process.exit(1);
});

// connecting to db
connectDatabase();

// setup security headers
app.use(helmet());

// setup body parser
app.use(express.json());

// set cookie parser
app.use(cookieParser());

// handle file upload
app.use(fileUpload());

// sanitize data
app.use(mongoSanitize());

// prevent xss attacks
app.use(xssClean());

// prevent parameter pollution - https://www.npmjs.com/package/hpp
app.use(hpp({
    whitelist: ['positions']
}));

// setup CORS - accessible by other domains - https://www.npmjs.com/package/cors
app.use(cors());

// rate limiting
const limiter = rateLimit({
    windowMs: 10*60*1000,  // 10 minutes
    max: 100
});
app.use(limiter);

// Importing routes
const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const user = require('./routes/user');

// Using the routes
app.use('/api/v1', jobs);
app.use('/api/v1', auth);
app.use('/api/v1', user);


// handle all unhandled routes
app.all('*', (req, res, next) => {
    next(new ErrorHandler(`${req.originalUrl} route not found`, 404));
})

// middleware to handle errors
app.use(errorMiddleware);

//const PORT = process.env.PORT;

const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
});

// handling unhandled process rejection
process.on('unhandledRejection', err => {
    console.log(`Error: ${err.stack}`);
    console.log(`Shutting down the server due to unhandled promise rejection`);
    server.close( () => {
        process.exit(1);
    } )
});

