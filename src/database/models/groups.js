const { Schema } = require("mongoose");

const ChatSchema = new Schema({
    chatId: {
        type: Number,
        required: true,
        unique: true,
    },
    chatName: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        required: true,
        default: false,
    },
    forwarding: {
        type: Boolean,
        required: true,
        default: true,
    },
});

module.exports = ChatSchema;
