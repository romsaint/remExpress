const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date_created: {
        type: Date,
        default: Date.now(),
        required: true
    },
    tags: [
        {
            type: String,
            required: false
        }
    ],
    user_id: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    isConfirm: {
        type: Boolean,
        required: true
    }
})

module.exports = mongoose.model('todos', schema)