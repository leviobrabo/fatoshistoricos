const { bot } = require("../bot");
const axios = require("axios");
const cheerio = require("cheerio");
const CronJob = require("cron").CronJob;

const { ChatModel } = require("../database");
const { UserModel } = require("../database");

const { startCommand } = require("../commands/start");
const { histimag } = require("../commands/histimag");
const { helpCommand } = require("../commands/help");

const channelId = process.env.channelId;
const channelStatusId = process.env.channelStatusId;
const groupId = process.env.groupId;
const owner = process.env.ownerId

bot.onText(/^\/start$/, (message) => {
    startCommand(bot, message);
});

bot.onText(/^\/fotoshist/, async (message) => {
    await histimag(bot, message);
});

bot.onText(/^\/help/, (message) => {
    helpCommand(bot, message);
});

// Função para verificar se o usuário tem is_dev: true
async function is_dev(user_id) {
    try {
        const user = await UserModel.findOne({ user_id: user_id });
        if (user && user.is_dev === true) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao verificar is_dev:', error);
        return false;
    }
}

bot.onText(/\/adddev (\d+)/, async (msg, match) => {
    const user_id = msg.from.id;
    const userId = match[1];

    if (user_id.toString() !== owner) {
        await bot.sendMessage(
            msg.chat.id,
            "Você não está autorizado a executar este comando."
        );
        return;
    }

    if (msg.chat.type !== "private") {
        return;
    }

    const user = await UserModel.findOne({ user_id: userId });

    if (!user) {
        console.log("Nenhum Usuário encontrado com o ID informado.");
        return;
    }

    if (user.is_dev) {
        await bot.sendMessage(user_id, `O usuário ${userId} já é um dev.`);
        return;
    }

    await UserModel.updateOne({ user_id: userId }, { $set: { is_dev: true } });
    await bot.sendMessage(
        userId,
        `Parabéns! Você foi promovido a usuário dev. Agora você tem acesso a recursos especiais.`
    );
    await bot.sendMessage(user_id, `Usuário ${userId} foi promovido a dev.`);
});

bot.onText(/\/deldev (\d+)/, async (msg, match) => {
    const user_id = msg.from.id;
    const userId = match[1];

    if (user_id.toString() !== owner) {
        await bot.sendMessage(
            msg.chat.id,
            "Você não está autorizado a executar este comando."
        );
        return;
    }

    if (msg.chat.type !== "private") {
        return;
    }

    const user = await UserModel.findOne({ user_id: userId });

    if (!user) {
        console.log("Nenhum Usuário encontrado com o ID informado.");
        return;
    }

    if (!user.is_dev) {
        await bot.sendMessage(user_id, `O usuário ${userId} já não é um dev.`);
        return;
    }

    await UserModel.updateOne({ user_id: userId }, { $set: { is_dev: false } });
    await bot.sendMessage(
        userId,
        `Você não é mais um usuário dev. Seus acessos especiais foram revogados.`
    );
    await bot.sendMessage(user_id, `Usuário ${userId} não é mais um dev.`);
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

                let chatusername;
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
                ).catch((error) => {
                    console.error(
                        `Erro ao enviar mensagem para o grupo ${chatId}: ${error}`
                    );
                });
            }
        }

        try {
            const developerMembers = await Promise.all(
                msg.new_chat_members.map(async (member) => {
                    if (member.is_bot === false && (await is_dev(member.id))) {
                        const user = await UserModel.findOne({ user_id: member.id });
                        if (user && user.is_dev === true) {
                            return member;
                        }
                    }
                })
            );

            if (developerMembers && developerMembers.length > 0) {
                const developerMember = developerMembers.find((member) => member !== undefined);
                if (developerMember) {
                    const message = `👨‍💻 <b>Um dos meus desenvolvedores entrou no grupo:</b> <a href="tg://user?id=${developerMember.id}">${developerMember.first_name}</a> 😎👍`;
                    bot.sendMessage(chatId, message, { parse_mode: "HTML" }).catch((error) => {
                        console.error(`Erro ao enviar mensagem para o grupo ${chatId}: ${error}`);
                    });
                }
            }
        } catch (err) {
            console.error(err);
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

bot.onText(/\/settopic/, async (msg) => {
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        await bot.sendMessage(msg.chat.id, 'Esse comando só pode ser enviado em grupos.');
        return;
    }

    const chatId = msg.chat.id;
    const threadId = msg.reply_to_message?.message_thread_id;
    const chatMember = await bot.getChatMember(chatId, msg.from.id);

    if (chatMember.status !== 'administrator' && chatMember.status !== 'creator') {
        return;
    }

    try {
        const chat = await ChatModel.findOne({ chatId });

        if (chat) {
            if (threadId === "1" || !threadId) {
                chat.thread_id = null;
                await chat.save();
                bot.sendMessage(chatId, "Será enviado as mensagens aqui!", { message_thread_id: chat.thread_id });
            } else if (chat.thread_id === threadId) {
                bot.sendMessage(chatId, `Este chat já está definido para receber mensagens do tópico ${threadId}.`, { message_thread_id: chat.thread_id });
            } else {
                chat.thread_id = threadId;
                await chat.save();
                bot.sendMessage(chatId, `Thread ID atualizado para: ${threadId}, agora você receberá as mensagens históricas aqui!`, { message_thread_id: threadId });
            }
        } else {
            const newChat = new ChatModel({ chatId, thread_id: threadId });
            await newChat.save();
            bot.sendMessage(chatId, `Thread ID definido como: ${threadId}, agora você receberá as mensagens históricas aqui!`, { message_thread_id: threadId });
        }
    } catch (error) {
        console.error("Error setting thread ID:", error.message);
    }
});

bot.onText(/\/cleartopic/, async (msg) => {
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        await bot.sendMessage(msg.chat.id, 'Esse comando só pode ser enviado em grupos.');
        return;
    }

    const chatId = msg.chat.id;
    const chatMember = await bot.getChatMember(chatId, msg.from.id);

    if (chatMember.status !== 'administrator' && chatMember.status !== 'creator') {
        return;
    }

    try {
        const chat = await ChatModel.findOne({ chatId });

        if (chat) {
            chat.thread_id = null;
            await chat.save();
            bot.sendMessage(chatId, "O tópico foi removido com sucesso. Você não receberá mais mensagens históricas aqui.");
        } else {
            bot.sendMessage(chatId, "Você ainda não definiu um tópico. Use o comando /settopic para definir um tópico.");
        }
    } catch (error) {
        console.error("Error clearing thread ID:", error.message);
    }
});





async function sendHistoricalEventsGroup(chatId) {
    try {
        const chat = await ChatModel.findOne({ chatId });
        const topic = chat.thread_id;
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
                message_thread_id: topic,
            }).catch(error => {
                console.error("Error sending message:", error.message);
            });
        } else {
            bot.sendMessage(chatId, "<b>Não há eventos históricos para hoje.</b>", {
                parse_mode: "HTML",
                reply_markup: inlineKeyboard,
                message_thread_id: topic,
            }).catch(error => {
                console.error("Error sending message:", error.message);
            });
        }
    } catch (error) {
        console.error("Error sending historical events:", error.message);
    }
}

const manhaJob = new CronJob(
    "00 08 * * *",
    async function () {
        try {
            const chatModels = await ChatModel.find({});
            for (const chatModel of chatModels) {
                const chatId = chatModel.chatId;
                if (chatId !== groupId) {
                    try {
                        sendHistoricalEventsGroup(chatId);
                        console.log(
                            `Mensagem enviada com sucesso para o grupo ${chatId}`
                        );
                    } catch (error) {
                        console.error(
                            `Error sending historical events to group ${chatId}:`,
                            error.message
                        );
                    }
                }
            }
        } catch (error) {
            console.error("Error in morning job:", error.message);
        }
    },
    null,
    true,
    "America/Sao_Paulo"
);

manhaJob.start();



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

async function sendHistoricalEventsUser(userId) {
    const user = await UserModel.findOne({ user_id: userId });
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

            user.messageId = messageId;
            await user.save();

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
    "30 8 * * *",
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

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const numUsers = await UserModel.countDocuments();
    const numChats = await ChatModel.countDocuments();

    const message = `\n──❑ 「 Bot Stats 」 ❑──\n\n ☆ ${numUsers} usuários\n ☆ ${numChats} chats`;

    try {
        await bot.sendMessage(chatId, message);
    } catch (error) {
        if (error.code === "ETELEGRAM" && error.response?.statusCode === 400) {
            console.error(`Error sending message to chat ${chatId}: not enough rights to send text messages to the chat`);
        } else {
            console.error("Error sending message:", error);
        }
    }
});

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

bot.onText(/^\/broadcast\b/, async (msg, match) => {
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
    let success_br = 0;
    let no_success = 0;
    let block_num = 0;
    for (const { user_id } of ulist) {
        try {
            await bot.sendMessage(user_id, query_, {
                disable_web_page_preview: !web_preview,
                parse_mode: "HTML",
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
    await bot.editMessageText(
        `
    ╭─❑ 「 <b>Broadcast Completed</b> 」 ❑──
    │- <i>Total Users:</i> \`${ulist.length}\`
    │- <i>Successful:</i> \`${success_br}\`
    │- <i>Blocked:</i> \`${block_num}\`
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


bot.onText(/^\/bc\b/, async (msg, match) => {
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
    const query = web_preview ? match.input.substring(4).trim() : match.input;
    const ulist = await UserModel.find().lean().select("user_id");
    let success_br = 0;
    let no_success = 0;
    let block_num = 0;

    if (msg.reply_to_message) {
        const replyMsg = msg.reply_to_message;
        for (const { user_id } of ulist) {
            try {
                await bot.forwardMessage(
                    user_id,
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
        for (const { user_id } of ulist) {
            try {
                await bot.sendMessage(user_id, query, {
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
  │- <i>Total User:</i> \`${ulist.length}\`
  │- <i>Successful:</i> \`${success_br}\`
  │- <i>Blocked:</i> \`${block_num}\`
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


bot.onText(/\/dev/, async (message) => {
    const userId = message.from.id;
    const user_id = message.from.id;

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
                "/broadcast - envia mensagem para todos usuários",
                "/bc - encaminha mensagem para todos os usuários",
                "/ping - veja a latência da VPS",
                "/ban - bloqueia um chat de receber a mensagem",
                "/unban - bloqueia um chat de receber a mensagem",
                "/banned - bloqueia um chat de receber a mensagem",
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
    if (!(await is_dev(user_id))) {
        bot.sendMessage(userId, message_start_dev, options_start_dev);
    } else {
        bot.sendMessage(message.chat.id, "Você não é desenvolvedor");
    }
});

bot.onText(/\/devs/, async (message) => {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!(await is_dev(userId))) {
        bot.sendMessage(
            chatId,
            "Este comando só pode ser usado por desenvolvedores!"
        );
        return;
    }

    if (message.chat.type !== "private" || chatId !== userId) {
        console.log("comando só pode ser usado no privado")
    }

    try {
        const devsData = await UserModel.find({ is_dev: true });

        let message = "<b>Lista de desenvolvedores:</b>\n\n";
        for (let user of devsData) {
            const { firstname, user_id } = user;
            message += `<b>User:</b> ${firstname} ||`;
            message += `<b> ID:</b> <code>${user_id}</code>\n`;
        }

        bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
        console.error(error);
        bot.sendMessage(
            chatId,
            "Ocorreu um erro ao buscar a lista de desenvolvedores!"
        );
    }
});

bot.onText(/\/ban/, async (message) => {
    const userId = message.from.id;
    const chatId = message.text.split(" ")[1];

    if (message.chat.type !== "private") {
        console.log("mensagem de ban só no privado do bot")
        return;
    }

    if (!(await is_dev(user_id))) {
        await bot.sendMessage(
            message.chat.id,
            "Você não está autorizado a executar este comando."
        );
        return;
    }

    const chat = await ChatModel.findOne({ chatId: chatId });

    if (!chat) {
        console.log("Nenhum grupo encontrado com o ID informado.");
        return;
    }

    if (chat.isBlocked) {
        await bot.sendMessage(
            message.chat.id,
            `Grupo ${chat.chatName} já foi banido.`
        );
        return;
    }

    let chatUsername;
    if (message.chat.username) {
        chatUsername = `@${message.chat.username}`;
    } else {
        chatUsername = "Private Group";
    }
    const banMessage = `#${nameBot} #Banned
    <b>Group:</b> ${chat.chatName}
    <b>ID:</b> <code>${chatId}</code>
    <b>Dev:</b> ${chatUsername}`;

    bot.sendMessage(groupId, banMessage, { parse_mode: "HTML" }).catch(
        (error) => {
            console.error(
                `Erro ao enviar mensagem para o grupo ${chatId}: ${error}`
            );
        }
    );

    try {
        await ChatModel.updateOne({ chatId: chatId }, { $set: { isBlocked: true } });
        await bot.sendMessage(chatId, `Toguro sairá do grupo e não pode ficar!!`);
    } catch (error) {
        console.error("Error sending message:", error);
    }
    await bot.leaveChat(chatId);



    await bot.sendMessage(
        message.chat.id,
        `Grupo ${chat.chatName} de ID: ${chatId} foi banido com sucesso.`
    );
});

bot.onText(/\/unban/, async (message) => {
    const userId = message.from.id;
    const chatId = message.text.split(" ")[1];

    if (message.chat.type !== "private") {
        await bot.sendMessage(
            console.log("Por favor, envie este comando em um chat privado com o bot.")
        );
        return;
    }

    if (!(await is_dev(userId))) {
        await bot.sendMessage(
            message.chat.id,
            "Você não está autorizado a executar este comando."
        );
        return;
    }

    const chat = await ChatModel.findOne({ chatId: chatId });

    if (!chat) {
        await bot.sendMessage(
            message.chat.id,
            `Nenhum grupo encontrado com o ID ${chatId}.`
        );
        return;
    }

    if (!chat.isBlocked) {
        await bot.sendMessage(
            message.chat.id,
            `O grupo ${chat.chatName} já está desbanido ou nunca foi banido.`
        );
        return;
    }

    let devUsername;
    if (message.chat.username) {
        devUsername = `@${message.chat.username}`;
    } else {
        devUsername = "Private Group";
    }
    const banMessage = `#${nameBot} #Unban
    <b>Group:</b> ${chat.chatName}
    <b>ID:</b> <code>${chatId}</code>
    <b>Dev:</b> ${devUsername}`;

    bot.sendMessage(groupId, banMessage, { parse_mode: "HTML" }).catch(
        (error) => {
            console.error(
                `Erro ao enviar mensagem para o grupo ${chatId}: ${error}`
            );
        }
    );

    await ChatModel.updateOne({ chatId: chatId }, { $set: { isBlocked: false } });
    await bot.sendMessage(
        message.chat.id,
        `Grupo ${chat.chatName} foi desbanido.`
    );
});


bot.onText(/\/banned/, async (message) => {
    const userId = message.from.id;

    if (message.chat.type !== "private") {
        await bot.sendMessage(
            console.log("Por favor, envie este comando em um chat privado com o bot.")
        );
        return;
    }

    if (!(await is_dev(userId))) {
        await bot.sendMessage(
            message.chat.id,
            "Você não está autorizado a executar este comando."
        );
        return;
    }

    const bannedChats = await ChatModel.find({ isBlocked: true });

    if (bannedChats.length === 0) {
        await bot.sendMessage(
            message.chat.id,
            "Nenhum chat encontrado no banco de dados que tenha sido banido."
        );
        return;
    }

    let contador = 1;
    let chunkSize = 3900;
    let messageChunks = [];
    let currentChunk = "<b>Chats banidos:</b>\n";

    for (const chat of bannedChats) {
        const groupMessage = `<b>${contador}:</b> <b>Group:</b> <a href="tg://resolve?domain=${chat.chatName}&amp;id=${chat.chatId}">${chat.chatName}</a> || <b>ID:</b> <code>${chat.chatId}</code>\n`;
        if (currentChunk.length + groupMessage.length > chunkSize) {
            messageChunks.push(currentChunk);
            currentChunk = "";
        }
        currentChunk += groupMessage;
        contador++;
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
                            callback_data: `banned:${index - 1}`,
                            disabled: index === 0,
                        },
                        {
                            text: `>> ${index + 2}`,
                            callback_data: `banned:${index + 1}`,
                            disabled: index === messageChunks.length - 1,
                        },
                    ],
                ],
            },
            parse_mode: "HTML",
        };
    };

    await bot.sendMessage(message.chat.id, messageChunks[index], markup(index));

    bot.on("callback_query", async (query) => {
        if (query.data.startsWith("banned:")) {
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
});

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
        "Mensagens privadas desativadas. Você não irá receber fatos históricos às 8 horas todos os dias."
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
        "Mensagens privadas ativadas. Você receberá fatos históricos todos os dias às 8 horas."
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
                // Find the thread_id from the database for this chat
                const chatModel = await ChatModel.findOne({ chatId });
                if (chatModel) {
                    const { thread_id } = chatModel;
                    await bot.forwardMessage(
                        chatId,
                        replyMsg.chat.id,
                        replyMsg.message_id,
                        { message_thread_id: thread_id }
                    );
                    success_br += 1;
                }
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
                // Find the thread_id from the database for this chat
                const chatModel = await ChatModel.findOne({ chatId });
                if (chatModel) {
                    const { thread_id } = chatModel;
                    await bot.sendMessage(chatId, query, {
                        disable_web_page_preview: !web_preview,
                        parse_mode: "HTML",
                        reply_to_message_id: msg.message_id,
                        message_thread_id: thread_id
                    });
                    success_br += 1;
                }
            } catch (err) {
                if (err.code === "ETELEGRAM" && err.response?.statusCode === 400) {
                    console.error(
                        `Error sending message to chat ${chatId}: not enough rights to send text messages to the chat`
                    );
                    block_num += 1;
                } else {
                    no_success += 1;
                    console.error("Error sending message:", err);
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
        if (error.code === "ETELEGRAM" && error.response?.statusCode === 400) {
            console.error(
                `Error sending historical event to chat ${chatId}: not enough rights to send text messages to the chat`
            );
        } else {
            console.error("Failed to send historical event:", error);
        }
    }
}

const tardJob = new CronJob(
    "0 15 * * *",
    async function () {
        const chatModels = await ChatModel.find({ forwarding: true });
        for (const chatModel of chatModels) {
            const chatId = chatModel.chatId;
            if (chatId !== groupId) {
                try {
                    await sendHistoricalEventsGroupImage(chatId);
                    console.log(`Mensagem enviada com sucesso para o chatID ${chatId}`);
                } catch (error) {
                    console.error(`Error sending historical events to chat ${chatId}:`, error);
                }
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

async function getholidayOfTheDay() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    try {
        var jsonEvents = require("../collections/holidayBr.json");
        var births = jsonEvents[month + "-" + day]["births"]
        if (births.length > 0) {
            const messageParts = [];
            births.forEach((birth, index) => {
                const name = `${birth.name}`;
                const bullet = "•";
                const birthMessage = `<i>${bullet}</i> ${name}`;
                messageParts.push(birthMessage);
            });

            let message = `<b>Data comemorativa do dia 🇧🇷</b> \n\n<b><i>${day} de ${getMonthName(month)}</i></b>\n\n`;

            message += messageParts.join("\n");

            await sendMessageToChannel(message);
        } else {
            console.log("Não há informações sobre nascidos hoje.");
        }
    } catch (error) {
        console.error("Erro ao obter informações:", error.message);
    }
}
const holidaybr = new CronJob(
    "00 30 06 * * *",
    getholidayOfTheDay,
    null,
    true,
    "America/Sao_Paulo"
);
holidaybr.start();

// async function sendHistoricalEventsChannelImage(channelId) {
//    const today = new Date();
//    const day = today.getDate();
//    const month = today.getMonth() + 1;
//
//    try {
//        const response = await axios.get(
//            `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`
//        );
//        const events = response.data.events;
//        const eventsWithPhoto = events.filter(
//            (event) => event.pages && event.pages[0].thumbnail
//        );
//
//        if (eventsWithPhoto.length === 0) {
//            console.log("Não há eventos com fotos para enviar hoje.");
//            return;
//        }
//
//        const randomIndex = Math.floor(Math.random() * eventsWithPhoto.length);
//        const event = eventsWithPhoto[randomIndex];
//
//        const caption = `<b>🖼 História ilustrada </b>\n\n<code>${event.text}</code>`;

//        const options = {
//            parse_mode: "HTML",
//        };

//        const photoUrl = event.pages[0].thumbnail.source;
//        await bot.sendPhoto(channelId, photoUrl, {
//            caption,
//            ...options,
//        });

//        console.log(`Historical event sent successfully to channelId ${channelId}.`);
//    } catch (error) {
//        console.error("Failed to send historical event:", error);
//    }
//}

//const imagechannel = new CronJob(
//    "00 00 08 * * *",
//    () => sendHistoricalEventsChannelImage(channelId),
//    null,
//    true,
//    "America/Sao_Paulo"
//);
//imagechannel.start();



//async function getCuriosidade() {
//    const today = new Date();
//    const day = today.getDate();
//    const month = today.getMonth() + 1;
//
//    try {
//        const jsonEvents = require("../collections/curiosidade.json");
//        const curiosidade = jsonEvents[`${month}-${day}`]?.curiosidade;
//        if (curiosidade) {
//            const info = curiosidade[0].texto;
//
//            //const info = curiosidade[1].texto1; (PARA 2025)
//            let message = `<b>Curiosidades Históricas 📜</b>\n\n`;
//            message += `${info}\n\n💬 Comente o que você achou abaixo;`;
//            await sendMessageToChannel(message);
//        } else {
//            console.log("Não há informações para o dia de hoje.");
//        }
//    } catch (error) {
//        console.error("Erro ao obter informações:", error.message);
//    }
//}

//const curiosidade = new CronJob(
//    "00 00 14 * * *",
//    getCuriosidade,
//    null,
//    true,
//    "America/Sao_Paulo"
//);
// curiosidade.start();


//async function getFrase() {
//    const today = new Date();
//    const day = today.getDate();
//    const month = today.getMonth() + 1;

//    try {
//        const jsonEvents = require("../collections/frases.json");
//        const frase = jsonEvents[`${month}-${day}`];
//        if (frase) {
//            const quote = frase.quote;
//            const author = frase.author;
//
//            let message = `<b>💡 Citação para refletir</b>\n\n`;
//            message += `"<i>${quote}"</i> - <b>${author}</b>\n\n`;
//            message += `💬 Comente o que você achou abaixo;`;
//            await sendMessageToChannel(message);
//        } else {
//            console.log("Não há informações para o dia de hoje.");
//        }
//    } catch (error) {
//        console.error("Erro ao obter informações:", error.message);
//    }
//}

//const frase = new CronJob(
//    "00 59 19 * * *",
//    getFrase,
//    null,
//    true,
//    "America/Sao_Paulo"
//);
// frase.start();

