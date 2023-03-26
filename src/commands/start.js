function startCommand(bot, message) {
    if (message.chat.type === "private") {
        const imageURL = "https://i.imgur.com/MzZuN3G.jpeg";

        const firstName = message.from.first_name;
        const message_start = `Olá, *${firstName}*, eu sou *Fatos Históricos!* \n\nSou um bot que envia diáriamente mensagem com fatos históricos acontecido no dia do envio da mensagem. \n\nAdicione-me em seu grupo.\n\n📦*Meu código-fonte:* [GitHub](https://github.com/leviobrabo/climatologiabot)`;

        const buttons = [
            [
                {
                    text: "Adicione-me em seu grupo",
                    url: "https://t.me/fatoshistbot?startgroup=true",
                },
            ],
            [
                { text: "👾 Canal", url: "https://t.me/lbrabo" },
                { text: "🪪 Dono", url: "https://t.me/Kylorensbot" },
            ],
            [{ text: "Fazer uma doação 💰", callback_data: "donate" }],
        ];

        bot.sendPhoto(message.chat.id, imageURL, {
            caption: message_start,
            disable_web_page_preview: true,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: buttons,
            },
        });
    }
}
bot.on("callback_query", async (callbackQuery) => {
    if (callbackQuery.message.chat.type !== "private") {
        return;
    }
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    if (callbackQuery.data === "donate") {
        const usuario = message.from.first_name;
        const chavePix = "32dc79d2-2868-4ef0-a277-2c10725341d4";
        const banco = "Picpay";
        const nome = "Luzia";

        const resposta = `Olá, ${usuario}! \n\nContribua com qualquer valor para ajudar a manter o servidor do bot online e com mais recursos! Sua ajuda é fundamental para mantermos o bot funcionando de forma eficiente e com novas funcionalidades. \n\nPara fazer uma doação, utilize a chave PIX a seguir: \nPix: \`\`\`${chavePix}\`\`\` \nBanco: ${banco}\nNome: ${nome}\n\nObrigado pela sua contribuição! 🙌"`;

        bot.editMessageText(message.chat.id, resposta, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Voltar",
                            callback_data: "back_to_start",
                        },
                    ],
                ],
            },
        });
    } else if (callbackQuery.data === "back_to_start") {
        const imageURL = "https://i.imgur.com/12345.jpeg";
        const caption =
            "Bem-vindo de volta! Aqui está outra imagem interessante:";
        await bot.sendPhoto(message.chat.id, imageURL, {
            caption: caption,
            disable_web_page_preview: true,
            parse_mode: "Markdown",
            reply_markup: buttons.reply_markup,
        });
    }
});
module.exports = {
    startCommand,
};
