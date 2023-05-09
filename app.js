const express = require('express');
const app = express();

const dotenv = require('dotenv');

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

// setup body parser
app.use(express.json());


// Importing routes
const jobs = require('./routes/jobs');

// Using the routes
app.use('/api/v1', jobs);


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
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to unhandled promise rejection`);
    server.close( () => {
        process.exit(1);
    } )
});

