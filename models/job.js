const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');
const geoCoder = require('../utils/geocoder');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter a job title'],
        trim: true,
        maxlength: [100, 'Job title can not exceed 100 characters.']
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Please enter a job description'],
        maxlength: [1000, 'Job description cannot exceed 1000 characters']
    },
    email: {
        type: String,
        validate: [validator.isEmail, 'Please add a valid email address.']
    },
    address: {
        type: String,
        required: [true, 'Please add an address.']
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            index: '2dsphere'
        },
        formattedAddress: String,
        city: String,
        state: String,
        zipcode: String,
        country: String
    },
    company: {
        type: String,
        require: [true, 'Please add company name.'],
    },
    industry: {
        type: [String],
        required: [true, 'Please add an industry.'],
        enum: {
            values: ['Business', 'IT', 'Banking', 'Training', 'TCOMM', 'Others'],
            message: 'Please select correct options'
        }
    },
    jobType: {
        type: String,
        required: [true, 'Please enter a job type.'],
        enum: {
            values: ['Permanent', 'Temporary', 'Internship'],
            message: 'Please select type'
        }
    },
    minEducation: {
        type: String,
        required: [true, 'Please enter the minimum education level required.'],
        enum: {
            values: ['Bachelors', 'Masters', 'PhD'],
            message: 'Please select education level'
        }
    },
    positions: {
        type: Number,
        default: 1
    },
    experience: {
        type: String,
        required: [true, 'Please enter experience desired.'],
        enum: {
            values: ['None', '1 to 2', '2 to 5', '5+'],
            message: 'Please select exp'
        }
    },
    salary: {
        type: Number,
        required: [true, 'Please list expected salary']
    },
    postingDate: {
        type: Date,
        default: Date.now
    },
    lastDate: {
        type: Date,
        default: new Date().setDate(new Date().getDate() + 7)
    },
    applicantApplied: {
        type: [Object],
        // hides it from response - field not returned
        select: false
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
});

// create job slug before saving
jobSchema.pre('save', function(next) {
    // creating slug before saving to db
    this.slug = slugify(this.title, { lower: true });

    next();
});

// setting up location stuff
jobSchema.pre('save', async function(next) {
    const loc = await geoCoder.geocode(this.address);

    this.location = {
        type: 'Point',
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        city: loc[0].city,
        state: loc[0].stateCode,
        zipcode: loc[0].zipcode,
        country: loc[0].countryCode
    }
});

module.exports = mongoose.model('Job', jobSchema);