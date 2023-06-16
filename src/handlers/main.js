const { bot } = require("../bot");
const axios = require("axios");
const cheerio = require("cheerio");
const CronJob = require("cron").CronJob;
const { ChatModel } = require("../database");
const { UserModel } = require("../database");

const { startCommand } = require("../commands/start");
const { histimag } = require("../commands/histimag");
const { helpCommand } = require("../commands/help");

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

bot.onText(/^\/grupos/, async (message) => {
    const user_id = message.from.id;
    if (!(await is_dev(user_id))) {
        return;
    }
    if (message.chat.type !== "private") {
        return;
    }

    try {
        const chats = await ChatModel.find().sort({ chatId: 1 });

        let contador = 1;
        let chunkSize = 3900 - message.text.length;
        let messageChunks = [];
        let currentChunk = "";

        for (let chat of chats) {
            if (chat.chatId < 0) {
                let groupMessage = `<b>${contador}:</b> <b>Group=</b> ${chat.chatName} || <b>ID:</b> <code>${chat.chatId}</code>\n`;
                if (currentChunk.length + groupMessage.length > chunkSize) {
                    messageChunks.push(currentChunk);
                    currentChunk = "";
                }
                currentChunk += groupMessage;
                contador++;
            }
        }
        messageChunks.push(currentChunk);

        let index = 0;

        const markup = (index) => {
            return {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: `<< ${index + 1}`,
                                callback_data: `groups:${index - 1}`,
                                disabled: index === 0,
                            },
                            {
                                text: `>> ${index + 2}`,
                                callback_data: `groups:${index + 1}`,
                                disabled: index === messageChunks.length - 1,
                            },
                        ],
                    ],
                },
                parse_mode: "HTML",
            };
        };

        await bot.sendMessage(
            message.chat.id,
            messageChunks[index],
            markup(index)
        );

        bot.on("callback_query", async (query) => {
            if (query.data.startsWith("groups:")) {
                index = Number(query.data.split(":")[1]);
                if (
                    markup(index).reply_markup &&
                    markup(index).reply_markup.inline_keyboard
                ) {
                    markup(index).reply_markup.inline_keyboard[0][0].disabled =
                        index === 0;
                    markup(index).reply_markup.inline_keyboard[0][1].disabled =
                        index === messageChunks.length - 1;
                }
                await bot.editMessageText(messageChunks[index], {
                    chat_id: query.message.chat.id,
                    message_id: query.message.message_id,
                    ...markup(index),
                });
                await bot.answerCallbackQuery(query.id);
            }
        });
    } catch (error) {
        console.error(error);
    }
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
                msg_private: true,
            });

            await user.save();
            console.log(`Usuário ${msg.from.id} salvo no banco de dados.`);

            const message = `#Fatoshistbot #New_User
        <b>User:</b> <a href="tg://user?id=${user.user_id}">${user.firstname
                }</a>
        <b>ID:</b> <code>${user.user_id}</code>
        <b>Username:</b> ${user.username ? `@${user.username}` : "Não informado"
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
        if (chatId === groupId) {
            console.log(
                `O chatId ${chatId} é igual ao groupId ${groupId}. Não será salvo no banco de dados.`
            );
        } else {
            const chat = await ChatModel.findOne({ chatId: chatId });

            if (chat) {
                console.log(
                    `Grupo ${chatName} (${chatId}) já existe no banco de dados`
                );
            } else {
                const newChat = await ChatModel.create({
                    chatId,
                    chatName,
                    forwarding: true,
                });
                console.log(
                    `Grupo ${newChat.chatName} (${newChat.chatId}) adicionado ao banco de dados`
                );

                const botUser = await bot.getMe();
                const newMembers = msg.new_chat_members.filter(
                    (member) => member.id === botUser.id
                );

                if (msg.chat.username) {
                    chatusername = `@${msg.chat.username}`;
                } else {
                    chatusername = "Private Group";
                }

                if (newMembers.length > 0) {
                    const message = `#Fatoshistbot #New_Group
                    <b>Group:</b> ${chatName}
                    <b>ID:</b> <code>${chatId}</code>
                    <b>Link:</b> ${chatusername}`;

                    bot.sendMessage(groupId, message, {
                        parse_mode: "HTML",
                    }).catch((error) => {
                        console.error(
                            `Erro ao enviar mensagem para o grupo ${chatId}: ${error}`
                        );
                    });
                }

                bot.sendMessage(
                    chatId,
                    "Olá, meu nome é Fatos Históricos! Obrigado por me adicionar em seu grupo.\n\nEu enviarei mensagens todos os dias às 8 horas e possuo alguns comandos.\n\nSe quiser receber mais fatos históricos, conceda-me as permissões de administrador para fixar mensagens e convidar usuários via link.",
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Canal Oficial 🇧🇷",
                                        url: "https://t.me/hoje_na_historia",
                                    },
                                ],
                                [
                                    {
                                        text: "Relatar bugs",
                                        url: "https://t.me/kylorensbot",
                                    },
                                ],
                            ],
                        },
                    }
                );
            }
        }

        const developerMembers = msg.new_chat_members.filter(
            (member) => member.is_bot === false && is_dev(member.id)
        );

        if (developerMembers.length > 0) {
            const message = `👨‍💻 <b>Um dos meus desenvolvedores entrou no grupo:</b> <a href="tg://user?id=${developerMembers[0].id}">${developerMembers[0].first_name}</a> 😎👍`;
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
    if (msg.chat.type !== "private") {
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
                "/grupos - lista todos os grupos do db",
                "/sendgp - encaminha msg para grupos",
                "/fwdoff - desativa o encaminhamento no grupo",
                "/fwdon - ativa o encaminhamento no grupo",
                "/fwrds - Lista de grupos com encaminhamento desabilitado",
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
async function sendHistoricalEventsUser(userId) {
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
        try {
            const sentMessage = await bot.sendMessage(userId, message, {
                parse_mode: "HTML",
                reply_markup: inlineKeyboard,
            });

            const messageId = sentMessage.message_id;

            await UserModel.findOneAndUpdate(
                { user_id: userId },
                { messageId: messageId }
            );

            console.log(`Mensagem enviada com sucesso para o usuário ${userId}`);
        } catch (error) {
            console.log(`Erro ao enviar mensagem para o usuário ${userId}: ${error.message}`);
            if (error.response && error.response.statusCode === 403) {
                await UserModel.findOneAndUpdate({ user_id: userId }, { msg_private: false });
                console.log(`O usuário ${userId} bloqueou o bot e foi removido das mensagens privadas`);
            }
        }
    } else {
        bot.sendMessage(userId, "<b>Não há eventos históricos para hoje.</b>", {
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
        });
    }
}

const userJob = new CronJob(
    "56 10 * * *",
    async function () {
        const users = await UserModel.find({ msg_private: true });
        for (const user of users) {
            const userId = user.user_id;
            const messageId = user.messageId;

            if (messageId) {
                try {
                    await bot.deleteMessage(userId, messageId);
                    console.log(`Mensagem anterior do usuário ${userId} excluída com sucesso`);
                } catch (error) {
                    console.log(`Erro ao excluir mensagem anterior do usuário ${userId}: ${error.message}`);
                }
            }

            await sendHistoricalEventsUser(userId);
        }
    },
    null,
    true,
    "America/Sao_Paulo"
);

userJob.start();

bot.onText(/\/sendoff/, async (msg) => {
    if (msg.chat.type !== "private") {
        return;
    }
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await UserModel.findOne({ user_id: userId });
    if (!user.msg_private) {
        bot.sendMessage(
            chatId,
            "Você já desativou a função de receber a mensagem no chat privado."
        );
        return;
    }
    await UserModel.findOneAndUpdate(
        { user_id: userId },
        { msg_private: false },
        { new: true }
    );
    console.log(
        `Usuário ${userId} atualizou para não receber mensagem no privado`
    );

    bot.sendMessage(
        chatId,
        "Mensagens privadas desativadas. Você não irá receber mensagem às 8 horas todos os dias."
    );
});

bot.onText(/\/sendon/, async (msg) => {
    if (msg.chat.type !== "private") {
        return;
    }
    const userId = msg.from.id;
    const user = await UserModel.findOne({ user_id: userId });

    if (!user) {
        bot.sendMessage(
            msg.chat.id,
            "Usuário não encontrado. Por favor, faça o registro primeiro."
        );
        return;
    }

    if (user.msg_private) {
        bot.sendMessage(
            msg.chat.id,
            "Você já ativou a função de receber mensagens no chat privado."
        );
        return;
    }

    await UserModel.findOneAndUpdate(
        { user_id: userId },
        { msg_private: true },
        { new: true }
    );

    console.log(`Usuário ${userId} atualizado para receber mensagens no privado`);

    bot.sendMessage(
        msg.chat.id,
        "Mensagens privadas ativadas. Você receberá mensagens todos os dias às 8 horas sobre fatos históricos."
    );
});

bot.onText(/\/sendgp/, async (msg, match) => {
    const user_id = msg.from.id;
    if (!(await is_dev(user_id))) {
        return;
    }
    if (msg.chat.type !== "private") {
        return;
    }

    const sentMsg = await bot.sendMessage(msg.chat.id, "<i>Processing...</i>", {
        parse_mode: "HTML",
    });
    const web_preview = match.input.startsWith("-d");
    const query = web_preview ? match.input.substring(6).trim() : match.input;
    const ulist = await ChatModel.find({ forwarding: true })
        .lean()
        .select("chatId");
    let success_br = 0;
    let no_success = 0;
    let block_num = 0;

    if (msg.reply_to_message) {
        const replyMsg = msg.reply_to_message;
        for (const { chatId } of ulist) {
            try {
                await bot.forwardMessage(
                    chatId,
                    replyMsg.chat.id,
                    replyMsg.message_id
                );
                success_br += 1;
            } catch (err) {
                if (
                    err.response &&
                    err.response.body &&
                    err.response.body.error_code === 403
                ) {
                    block_num += 1;
                } else {
                    no_success += 1;
                }
            }
        }
    } else {
        for (const { chatId } of ulist) {
            try {
                await bot.sendMessage(chatId, query, {
                    disable_web_page_preview: !web_preview,
                    parse_mode: "HTML",
                    reply_to_message_id: msg.message_id,
                });
                success_br += 1;
            } catch (err) {
                if (
                    err.response &&
                    err.response.body &&
                    err.response.body.error_code === 403
                ) {
                    block_num += 1;
                } else {
                    no_success += 1;
                }
            }
        }
    }

    await bot.editMessageText(
        `
  ╭─❑ 「 <b>Broadcast Completed</b> 」 ❑──
  │- <i>Total Group:</i> \`${ulist.length}\`
  │- <i>Successful:</i> \`${success_br}\`
  │- <i>Removed:</i> \`${block_num}\`
  │- <i>Failed:</i> \`${no_success}\`
  ╰❑
    `,
        {
            chat_id: sentMsg.chat.id,
            message_id: sentMsg.message_id,
            parse_mode: "HTML",
        }
    );
});

bot.onText(/\/fwdoff/, async (msg) => {
    if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
        return;
    }

    const user_id = msg.from.id;
    const chat_id = msg.chat.id;

    const chatAdmins = await bot.getChatAdministrators(chat_id);
    const isAdmin = chatAdmins.some((admin) => admin.user.id === user_id);

    if (!isAdmin) {
        return;
    }

    const chat = await ChatModel.findOne({ chatId: chat_id });
    if (!chat || chat.forwarding === false) {
        await bot.sendMessage(chat_id, "O encaminhamento já está desativado.");
        return;
    }

    try {
        await ChatModel.updateMany({ chatId: chat_id }, { forwarding: false });
        console.log(
            `O bate-papo com ID ${chat_id} foi atualizado. Encaminhamento definido como falso.`
        );
        await bot.sendMessage(chat_id, "O encaminhamento foi desativado.");
    } catch (error) {
        console.error("Erro ao desativar o encaminhamento:", error);
        await bot.sendMessage(
            chat_id,
            "Ocorreu um erro ao desativar o encaminhamento."
        );
    }
});

bot.onText(/\/fwdon/, async (msg) => {
    if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
        return;
    }

    const user_id = msg.from.id;
    const chat_id = msg.chat.id;

    const chatAdmins = await bot.getChatAdministrators(chat_id);
    const isAdmin = chatAdmins.some((admin) => admin.user.id === user_id);

    if (!isAdmin) {
        return;
    }

    const chat = await ChatModel.findOne({ chatId: chat_id });
    if (!chat || chat.forwarding === true) {
        await bot.sendMessage(chat_id, "O encaminhamento já está habilitado.");
        return;
    }

    try {
        await ChatModel.updateMany({ chatId: chat_id }, { forwarding: true });
        console.log(
            `O bate-papo com ID ${chat_id} foi atualizado. Encaminhamento definido como verdadeiro.`
        );
        await bot.sendMessage(chat_id, "O encaminhamento foi ativado.");
    } catch (error) {
        console.error("Erro ao ativar o encaminhamento:", error);
        await bot.sendMessage(
            chat_id,
            "Ocorreu um erro ao ativar o encaminhamento."
        );
    }
});

bot.onText(/\/fwrds/, async (msg) => {
    if (msg.chat.type !== "private") {
        return;
    }

    const user_id = msg.from.id;

    if (!(await is_dev(user_id))) {
        return;
    }

    try {
        const groups = await ChatModel.find({ forwarding: false })
            .lean()
            .select("chatId chatName");

        if (groups.length === 0) {
            await bot.sendMessage(
                msg.chat.id,
                "Nenhum grupo encontrado com encaminhamento desativado."
            );
        } else {
            let response = "Grupos com encaminhamento desativado:\n\n";

            groups.forEach((group) => {
                response += `Chat ID: ${group.chatId} || Chat Name: ${group.chatName || "-"
                    }\n`;
            });

            await bot.sendMessage(msg.chat.id, response);
        }
    } catch (error) {
        console.error("Erro ao recuperar grupos:", error);
        await bot.sendMessage(
            msg.chat.id,
            "Ocorreu um erro ao recuperar os grupos."
        );
    }
});

async function sendMessageToChannel(message) {
    try {
        await bot.sendMessage(channelId, message, { parse_mode: "HTML" });
        console.log("Mensagem enviada com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error.message);
    }
}

async function getDeathsOfTheDay() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    try {
        const response = await axios.get(
            `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/deaths/${month}/${day}`,
            {
                headers: {
                    accept: 'application/json; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/onthisday/0.3.3"',
                },
            }
        );

        if (response.data.deaths.length > 0) {
            const deaths = response.data.deaths.slice(0, 5);
            const messageParts = [];

            deaths.forEach((death, index) => {
                const name = `<b>${death.text}</b>`;
                const info =
                    death.pages?.[0]?.extract || "Informações não disponíveis.";
                const date = death.year || "Data desconhecida.";
                const deathMessage = `<i>${index + 1
                    }.</i> <b>Nome:</b> ${name}\n<b>Informações:</b> ${info}\n<b>Data da morte:</b> ${date}`;
                messageParts.push(deathMessage);
            });

            let message = `<b>ℹ️ Mortes neste dia, ${day} de ${getMonthName(month)}</b>\n\n`;

            message += messageParts.join("\n\n");

            message += "\n\n⚰️ Você sabia disso?";

            await sendMessageToChannel(message);
        } else {
            console.log("Não há informações sobre mortos para o dia atual.");
        }
    } catch (error) {
        console.error("Erro ao obter informações:", error.message);
    }
}

const death = new CronJob(
    "00 15 * * *",
    getDeathsOfTheDay,
    null,
    true,
    "America/Sao_Paulo"
);
death.start();

async function getBirthsOfTheDay() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    try {
        const response = await axios.get(
            `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/births/${month}/${day}`,
            {
                headers: {
                    accept: 'application/json; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/onthisday/0.3.3"',
                },
            }
        );

        if (response.data.births.length > 0) {
            const births = response.data.births.slice(0, 5);
            const messageParts = [];

            births.forEach((birth, index) => {
                const name = `<b>${birth.text}</b>`;
                const info =
                    birth.pages?.[0]?.extract || "Informações não disponíveis.";
                const date = birth.year || "Data desconhecida.";
                const birthMessage = `<i>${index + 1
                    }.</i> <b>Nome:</b> ${name}\n<b>Informações:</b> ${info}\n<b>Data de nascimento:</b> ${date}`;
                messageParts.push(birthMessage);
            });

            let message = `<b>🔘 Nascimentos neste dia, ${day} de ${getMonthName(month)}</b>\n\n`;

            message += messageParts.join("\n\n");

            message += "\n\n🎂 Você sabia disso?";

            await sendMessageToChannel(message);
        } else {
            console.log("Não há informações sobre nascidos hoje.");
        }
    } catch (error) {
        console.error("Erro ao obter informações:", error.message);
    }
}

const birth = new CronJob(
    "00 22 * * *",
    getBirthsOfTheDay,
    null,
    true,
    "America/Sao_Paulo"
);
birth.start();

async function getHolidaysOfTheDay() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    try {
        const response = await axios.get(
            `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/holidays/${month}/${day}`,
            {
                headers: {
                    accept: 'application/json; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/onthisday/0.3.3"',
                },
            }
        );

        if (response.data.holidays.length > 0) {
            const holidays = response.data.holidays.slice(0, 5);
            const messageParts = [];

            holidays.forEach((holiday, index) => {
                const name = `<b>${holiday.text}</b>`;
                const info =
                    holiday.pages?.[0]?.extract ||
                    "Informações não disponíveis.";
                const holidayMessage = `<i>${index + 1
                    }.</i> <b>Nome:</b> ${name}\n<b>Informações:</b> ${info}`;
                messageParts.push(holidayMessage);
            });

            let message = `<b>🔘 Datas comemorativas neste dia, ${day} de ${getMonthName(month)}</b>\n\n`;

            message += messageParts.join("\n\n");

            message += "\n\n🌍 Você sabia disso?";

            await sendMessageToChannel(message);
        } else {
            console.log(
                "Não há informações sobre feriados mundiais para o dia atual."
            );
        }
    } catch (error) {
        console.error("Erro ao obter informações:", error.message);
    }
}

const holiday = new CronJob(
    "30 23 * * *",
    getHolidaysOfTheDay,
    null,
    true,
    "America/Sao_Paulo"
);
holiday.start();

async function sendHistoricalEventsGroupImage(chatId) {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
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

    try {
        const response = await axios.get(
            `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`
        );
        const events = response.data.events;
        const randomIndex = Math.floor(Math.random() * events.length);
        const event = events[randomIndex];

        const caption = `<b>Você sabia?</b>\n\n<code>${event.text}</code>`;

        const options = {
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
        };

        if (event.pages && event.pages[0].thumbnail) {
            const photoUrl = event.pages[0].thumbnail.source;
            await bot.sendPhoto(chatId, photoUrl, {
                caption,
                ...options,
            });
        } else {
            await bot.sendMessage(chatId, caption, options);
        }

        console.log(`Historical event sent successfully to chatID ${chatId}.`);
    } catch (error) {
        console.error("Failed to send historical event:", error);
    }
}

const tardJob = new CronJob(
    "0 15 * * *",
    async function () {
        const chatModels = await ChatModel.find({ forwarding: true });
        for (const chatModel of chatModels) {
            const chatId = chatModel.chatId;
            if (chatId !== groupId) {
                sendHistoricalEventsGroupImage(chatId);
                console.log(`Mensagem enviada com sucesso para o chatID ${chatId}`);
            }
        }
    },
    null,
    true,
    "America/Sao_Paulo"
);

tardJob.start();

function getMonthName(month) {
    const monthNames = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    return monthNames[month - 1];
}

