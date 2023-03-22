const dotenv = require("dotenv");
dotenv.config();

const initializeMainModule = require("./handlers/main");

const bot2 = initializeMainModule();
const { bot } = require("./bot");

const startCommand = require("./commands/start");
const { histimag } = require("./commands/histimag");
const { helpCommand } = require("./commands/help");

bot.onText(/^\/start/, startCommand);

bot.onText(/^\/fotoshist/, async (message) => {
    await histimag(bot, message);
});

bot.onText(/^\/help/, (message) => {
    helpCommand(bot, message);
});
