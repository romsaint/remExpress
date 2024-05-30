const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    codeForAuth: {
        type: String,
        required: true
    },
    isVerificated: {
        type: Boolean,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    date_created: {
        type: Date,
        default: Date.now(),
        required: true
    },
    unique_id: {
        type: String,
        required: true,
        unique: true
    }
})

module.exports = mongoose.model('users', schema)