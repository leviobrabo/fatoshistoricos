const mongoose = require('mongoose')
const dotenv = require('dotenv')
const ChatSchema = require("./models/groups");



dotenv.config()

mongoose.connect(process.env.DB_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})


const ChatModel = mongoose.model('Chat', ChatSchema)



module.exports = { ChatModel }