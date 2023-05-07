const { bot } = require("../bot");
const axios = require("axios");
const cheerio = require("cheerio");
const CronJob = require("cron").CronJob;
const { ChatModel } = require("../database");
const { UserModel } = require("../database");

const { startCommand } = require("../commands/start");
const { histimag } = require("../commands/histimag");
const { helpCommand } = require("../commands/help");
const translate = require("translate-google");

const groupId = process.env.groupId;
function is_dev(user_id) {
    const devUsers = process.env.DEV_USERS.split(",");
    return devUsers.includes(user_id.toString());
}
bot.onText(/^\/start$/, (message) => {
    startCommand(bot, message);
});

bot.onText(/^\/fotoshist/, async (message) => {
    await histimag(bot, message);
});

bot.onText(/^\/help/, (message) => {
    helpCommand(bot, message);
});

bot.on("message", async (msg) => {
    try {
        if (
            msg.chat.type === "private" &&
            msg.entities &&
            msg.entities[0].type === "bot_command"
        ) {
            const existingUser = await UserModel.findOne({
                user_id: msg.from.id,
            });
            if (existingUser) {
                return;
            }

            const user = new UserModel({
                user_id: msg.from.id,
                username: msg.from.username,
                firstname: msg.from.first_name,
                lastname: msg.from.last_name,
            });

            await user.save();
            console.log(`Usuário ${msg.from.id} salvo no banco de dados.`);

            const message = `#Fatoshistbot #New_User
        <b>User:</b> <a href="tg://user?id=${user.user_id}">${
                user.firstname
            }</a>
        <b>ID:</b> <code>${user.user_id}</code>
        <b>Username:</b> ${
            user.username ? `@${user.username}` : "Não informado"
        }`;
            bot.sendMessage(groupId, message, { parse_mode: "HTML" });
        }
    } catch (error) {
        console.error(
            `Erro em salvar o usuário ${msg.from.id} no banco de dados: ${error.message}`
        );
    }
});

bot.on("polling_error", (error) => {
    console.error(error);
});

bot.on("new_chat_members", async (msg) => {
    const chatId = msg.chat.id;
    const chatName = msg.chat.title;

    try {
        const chat = await ChatModel.findOne({ chatId: chatId });

        if (chat) {
            console.log(
                `Grupo ${chatName} (${chatId}) já existe no banco de dados`
            );
        } else if (chatId === groupId) {
            console.log(
                `O chatId ${chatId} é igual ao groupId ${groupId}. Não será salvo no banco de dados.`
            );
        } else {
            const newChat = await ChatModel.create({ chatId, chatName });
            console.log(
                `Grupo ${newChat.chatName} (${newChat.chatId}) adicionado ao banco de dados`
            );

            const botUser = await bot.getMe();
            const newMembers = msg.new_chat_members.filter(
                (member) => member.id === botUser.id
            );

            if (newMembers.length > 0) {
                const message = `#Fatoshistbot #New_Group
            <b>Group:</b> ${chatName}
            <b>ID:</b> <code>${chatId}</code>`;

                bot.sendMessage(groupId, message, { parse_mode: "HTML" }).catch(
                    (error) => {
                        console.error(
                            `Erro ao enviar mensagem para o grupo ${chatId}: ${error}`
                        );
                    }
                );
            }

            bot.sendMessage(
                chatId,
                "Olá, meu nome é Fatos Históricos! Obrigado por me adicionado em seu grupo.\n\nEu enviarei mensagem todos os dias às 8 horas e possuo alguns comandos.",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Visite nosso canal",
                                    url: "https://t.me/pjtlbrabo",
                                },
                                {
                                    text: "Relate bugs",
                                    url: "https://t.me/kylorensbot",
                                },
                            ],
                        ],
                    },
                }
            );
        }
        const developerMembers = msg.new_chat_members.filter(
            (member) => member.is_bot === false && is_dev(member.id)
        );

        if (developerMembers.length > 0) {
            const message = `👨‍💻 <b>ᴜᴍ ᴅᴏs ᴍᴇᴜs ᴅᴇsᴇɴᴠᴏʟᴠᴇᴅᴏʀᴇs ᴇɴᴛʀᴏᴜ ɴᴏ ɢʀᴜᴘᴏ</b> <a href="tg://user?id=${developerMembers[0].id}">${developerMembers[0].first_name}</a> 😎👍`;
            bot.sendMessage(chatId, message, { parse_mode: "HTML" }).catch(
                (error) => {
                    console.error(
                        `Erro ao enviar mensagem para o grupo ${chatId}: ${error}`
                    );
                }
            );
        }
    } catch (err) {
        console.error(err);
    }
});

bot.on("left_chat_member", async (msg) => {
    const botUser = await bot.getMe();
    if (msg.left_chat_member.id === botUser.id && msg.chat.id === groupId) {
        console.log("Bot left the group!");

        try {
            const chatId = msg.chat.id;
            const chat = await ChatModel.findOneAndDelete({ chatId });
            console.log(
                `Grupo ${chat.chatName} (${chat.chatId}) removido do banco de dados`
            );
        } catch (err) {
            console.error(err);
        }
    }
});

let day, month;

async function getHistoricalEvents() {
    const today = new Date();
    day = today.getDate();
    month = today.getMonth() + 1;

    const response = await axios.get(
        `https://www.educabras.com/hoje_na_historia/buscar/${day}/${month}`
    );
    const $ = cheerio.load(response.data);
    const eventDiv = $(".nascido_neste_dia");
    let eventText = eventDiv.text().trim();

    return eventText;
}

async function sendHistoricalEventsGroup(chatId) {
    const events = await getHistoricalEvents();
    const inlineKeyboard = {
        inline_keyboard: [
            [
                {
                    text: "📢 Canal Oficial",
                    url: "https://t.me/hoje_na_historia",
                },
            ],
        ],
    };

    if (events) {
        const message = `<b>HOJE NA HISTÓRIA</b>\n\n📅 Acontecimento em <b>${day}/${month}</b>\n\n<i>${events}</i>`;
        bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
        });
    } else {
        bot.sendMessage(chatId, "<b>Não há eventos históricos para hoje.</b>", {
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
        });
    }
}

const manhaJob = new CronJob(
    "0 8 * * *",
    async function () {
        const chatModels = await ChatModel.find({});
        for (const chatModel of chatModels) {
            const chatId = chatModel.chatId;
            if (chatId !== groupId) {
                sendHistoricalEventsGroup(chatId);
                console.log(
                    `Mensagem enviada com sucesso para os grupos ${chatId}`
                );
            }
        }
    },
    null,
    true,
    "America/Sao_Paulo"
);

manhaJob.start();

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const numUsers = await UserModel.countDocuments();
    const numChats = await ChatModel.countDocuments();

    const message = `\n──❑ 「 Bot Stats 」 ❑──\n\n ☆ ${numUsers} usuários\n ☆ ${numChats} chats`;
    bot.sendMessage(chatId, message);
});
bot.on("polling_error", (error) => {
    console.error(`Erro no bot de polling: ${error}`);
});

const channelId = process.env.channelId;

async function sendHistoricalEventsChannel(channelId) {
    const events = await getHistoricalEvents();
    if (events) {
        const message = `<b>HOJE NA HISTÓRIA</b>\n\n📅 Acontecimento em <b>${day}/${month}</b>\n\n<i>${events}</i>`;
        bot.sendMessage(channelId, message, { parse_mode: "HTML" });
    } else {
        bot.sendMessage(
            channelId,
            "<b>Não há eventos históricos para hoje.</b>",
            { parse_mode: "HTML" }
        );
    }
}

const channelJob = new CronJob(
    "0 5 * * *",
    function () {
        sendHistoricalEventsChannel(channelId);
        console.log(`Mensagem enviada com sucesso para o canal ${channelId}`);
    },
    null,
    true,
    "America/Sao_Paulo"
);

channelJob.start();

exports.initHandler = () => {
    return bot;
};

function timeFormatter(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const hoursFormatted = String(hours).padStart(2, "0");
    const minutesFormatted = String(minutes).padStart(2, "0");
    const secondsFormatted = String(secs).padStart(2, "0");

    return `${hoursFormatted}:${minutesFormatted}:${secondsFormatted}`;
}

bot.onText(/\/ping/, async (msg) => {
    const start = new Date();
    const replied = await bot.sendMessage(msg.chat.id, "𝚙𝚘𝚗𝚐!");
    const end = new Date();
    const m_s = end - start;
    const uptime = process.uptime();
    const uptime_formatted = timeFormatter(uptime);
    await bot.editMessageText(
        `𝚙𝚒𝚗𝚐: \`${m_s}𝚖𝚜\`\n𝚞𝚙𝚝𝚒𝚖𝚎: \`${uptime_formatted}\``,
        {
            chat_id: replied.chat.id,
            message_id: replied.message_id,
            parse_mode: "Markdown",
        }
    );
});

bot.onText(/^(\/broadcast|\/bc)\b/, async (msg, match) => {
    const user_id = msg.from.id;
    if (!(await is_dev(user_id))) {
        return;
    }

    const query = match.input.substring(match[0].length).trim();
    if (!query) {
        return bot.sendMessage(
            msg.chat.id,
            "<i>I need text to broadcast.</i>",
            { parse_mode: "HTML" }
        );
    }
    const sentMsg = await bot.sendMessage(msg.chat.id, "<i>Processing...</i>", {
        parse_mode: "HTML",
    });
    const web_preview = query.startsWith("-d");
    const query_ = web_preview ? query.substring(2).trim() : query;
    const ulist = await UserModel.find().lean().select("user_id");
    let sucess_br = 0;
    let no_sucess = 0;
    let block_num = 0;
    for (const { user_id } of ulist) {
        try {
            await bot.sendMessage(user_id, query_, {
                disable_web_page_preview: !web_preview,
                parse_mode: "HTML",
            });
            sucess_br += 1;
        } catch (err) {
            if (
                err.response &&
                err.response.body &&
                err.response.body.error_code === 403
            ) {
                block_num += 1;
            } else {
                no_sucess += 1;
            }
        }
    }
    await bot.editMessageText(
        `
  ╭─❑ 「 <b>Broadcast Completed</b> 」 ❑──
  │- <i>Total Users:</i> \`${ulist.length}\`
  │- <i>Successful:</i> \`${sucess_br}\`
  │- <i>Blocked:</i> \`${block_num}\`
  │- <i>Failed:</i> \`${no_sucess}\`
  ╰❑
    `,
        {
            chat_id: sentMsg.chat.id,
            message_id: sentMsg.message_id,
            parse_mode: "HTML",
        }
    );
});
bot.onText(/\/dev/, async (message) => {
    const userId = message.from.id;
    if (message.chat.type !== "private") {
        return;
    }
    const firstName = message.from.first_name;
    const message_start_dev = `Olá, <b>${firstName}</b>! Você é um dos desenvolvedores 🧑‍💻\n\nVocê está no painel do desenvolvedor da Janna, então aproveite a responsabilidade e use os comandos com consciências`;
    const options_start_dev = {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "📬 Canal Oficial",
                        url: "https://t.me/climatologiaofc",
                    },
                ],
                [
                    {
                        text: "🗃 Lista de para desenvolvedores",
                        callback_data: "commands",
                    },
                ],
            ],
        },
    };
    bot.on("callback_query", async (callbackQuery) => {
        if (callbackQuery.message.chat.type !== "private") {
            return;
        }
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        if (callbackQuery.data === "commands") {
            const commands = [
                "/stats - Estatística de grupos, usuarios e mensagens enviadas",
                "/broadcast ou /bc - envia mensagem para todos usuários",
                "/ping - veja a latência da VPS",
                "/block - bloqueia um chat de receber a mensagem",
            ];
            await bot.editMessageText(
                "<b>Lista de Comandos:</b> \n\n" + commands.join("\n"),
                {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "⬅️ Voltar",
                                    callback_data: "back_to_start",
                                },
                            ],
                        ],
                    },
                }
            );
        } else if (callbackQuery.data === "back_to_start") {
            await bot.editMessageText(message_start_dev, {
                parse_mode: "HTML",
                chat_id: chatId,
                message_id: messageId,
                disable_web_page_preview: true,
                reply_markup: options_start_dev.reply_markup,
            });
        }
    });
    if (is_dev(userId)) {
        bot.sendMessage(userId, message_start_dev, options_start_dev);
    } else {
        bot.sendMessage(message.chat.id, "Você não é desenvolvedor");
    }
});

bot.onText(/\/block (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (msg.chat.type !== "private") {
        return bot.sendMessage(
            chatId,
            "Este comando só pode ser usado em um chat privado."
        );
    }

    if (!is_dev(msg.from.id)) {
        return bot.sendMessage(
            chatId,
            "Você não está autorizado a executar este comando."
        );
    }

    const chatIdToBlock = match[1];

    if (!chatIdToBlock) {
        return bot.sendMessage(
            chatId,
            "Por favor, forneça o ID do chat que deseja bloquear."
        );
    }

    try {
        const chatModel = await ChatModel.findOne({ chatId: chatIdToBlock });
        if (!chatModel) {
            return bot.sendMessage(chatId, "Chat não encontrado.");
        }

        chatModel.isBlocked = true;
        await chatModel.save();

        bot.sendMessage(chatId, `Chat ${chatIdToBlock} bloqueado com sucesso.`);
    } catch (error) {
        console.log(error);
        bot.sendMessage(chatId, "Ocorreu um erro ao bloquear o chat.");
    }
});

const channelStatusId = process.env.channelStatusId;

async function sendStatus() {
    const start = new Date();
    const replied = await bot.sendMessage(channelStatusId, "Bot is ON");
    const end = new Date();
    const m_s = end - start;
    const uptime = process.uptime();
    const uptime_formatted = timeFormatter(uptime);
    const numUsers = await UserModel.countDocuments();
    const numChats = await ChatModel.countDocuments();
    await bot.editMessageText(
        `#Fatoshistbot #Status\n\nStatus: ON\nPing: \`${m_s}ms\`\nUptime: \`${uptime_formatted}\`\nUsers: \`${numUsers}\`\nChats: \`${numChats}\``,
        {
            chat_id: replied.chat.id,
            message_id: replied.message_id,
            parse_mode: "Markdown",
        }
    );
}

function timeFormatter(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const hoursFormatted = String(hours).padStart(2, "0");
    const minutesFormatted = String(minutes).padStart(2, "0");
    const secondsFormatted = String(secs).padStart(2, "0");

    return `${hoursFormatted}:${minutesFormatted}:${secondsFormatted}`;
}

const job = new CronJob(
    "03 00 12 * * *",
    sendStatus,
    null,
    true,
    "America/Sao_Paulo"
);

// ENVIAR EM UM CANAL INGLÊS

const channelIdEn = process.env.channelIdEn;

async function getHistoricalEventsEn() {
    const today = new Date();
    day = today.getDate();
    month = today.getMonth() + 1;

    const response = await axios.get(
        `https://www.educabras.com/hoje_na_historia/buscar/${day}/${month}`
    );
    const $ = cheerio.load(response.data);
    const eventDiv = $(".nascido_neste_dia");
    let eventText = eventDiv.text().trim();

    eventText = await translate(eventText, { to: "en" });

    return eventText;
}

async function sendHistoricalEventsChannel(channelIdEn) {
    const events = await getHistoricalEventsEn();
    if (events) {
        const message = `<b>TODAY IN HISTORY</b>\n\n📅 Event on <b>${day}/${month}</b>\n\n<i>${events}</i>`;
        const translatedMessage = await translate(message, { to: "en" });
        bot.sendMessage(channelIdEn, translatedMessage, {
            parse_mode: "HTML",
        });
    } else {
        const errorMessage = "<b>There are no historical events for today.</b>";
        const translatedErrorMessage = await translate(errorMessage, {
            to: "en",
        });
        bot.sendMessage(channelIdEn, translatedErrorMessage, {
            parse_mode: "HTML",
        });
    }
}

const channelEnJob = new CronJob(
    "0 6 * * *",
    function () {
        sendHistoricalEventsChannel(channelIdEn);
        console.log(`Mensagem enviada com sucesso para o canal ${channelIdEn}`);
    },
    null,
    true,
    "America/Sao_Paulo"
);

channelEnJob.start();
