const dotenv = require('dotenv')
dotenv.config()


const initializeMainModule = require('./handlers/main');


const bot2 = initializeMainModule();
const {bot} = require('./bot')



const startCommand = require('./commands/start');
bot.onText(/\/start/, startCommand);