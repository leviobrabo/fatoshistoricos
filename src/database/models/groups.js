const { Schema } = require("mongoose");

const ChatSchema = new Schema({
    chat_id: {
        type: Number,
        required: true,
        unique: true,
    },
    chat_name: {
        type: String,
        required: false,
    },
    blocked: {
        type: Boolean,
        required: true,
        default: false,
    },
    forwarding: {
        type: Boolean,
        required: true,
        default: true,
    },
    thread_id: {
        type: Number,
        required: false,
    },
    question: {
        type: Boolean,
        required: true,
        default: false,
    }
});

module.exports = ChatSchema;
