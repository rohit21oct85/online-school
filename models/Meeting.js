const mongoose = require('mongoose')

const MeetingSchema = mongoose.Schema({
    room_name: {
        type: String,
        required: true
    },
    room_id: {
        type: String,
        required: true
    },
    room_host: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now()
    },
    meeting_type: {
        type: String,
    }
});

const Meeting = mongoose.model('Meeting', MeetingSchema)

module.exports = Meeting;