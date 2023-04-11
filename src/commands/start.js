function startCommand(bot, message) {
    if (message.chat.type !== "private") {
        return;
    }
    const firstName = message.from.first_name;

    const message_start = `Olá, <b>${firstName}</b>! \n\nEu sou <b>Fatos Históricos</b>, sou um bot que envia diáriamente mensagem com acontecimentos históricos acontecido no dia do envio da mensagem. \n\nAdicione-me em seu grupo.\n\n📦<b>Meu código-fonte:</b> <a href="https://github.com/leviobrabo/fatoshistoricos">GitHub</a>`;
    const options_start = {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Adicione-me em seu grupo",
                        url: "https://t.me/fatoshistbot?startgroup=true",
                    },
                ],
                [
                    {
                        text: "👾 Canal",
                        url: "https://t.me/lbrabo",
                    },
                    {
                        text: "Fazer uma doação 💰",
                        callback_data: "donate",
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

        if (callbackQuery.data === "donate") {
            const resposta_donate = `Olá, ${firstName}! \n\nContribua com qualquer valor para ajudar a manter o servidor do bot online e com mais recursos! Sua ajuda é fundamental para mantermos o bot funcionando de forma eficiente e com novas funcionalidades. \n\nPara fazer uma doação, utilize a chave PIX a seguir: \nPix: <code>32dc79d2-2868-4ef0-a277-2c10725341d4</code>\nBanco: Picpay\nNome: Luzia\n\nObrigado pela sua contribuição! 🙌\n\n<b>BTC:</b> <code>bc1qjxzlug0cwnfjrhacy9kkpdzxfj0mcxc079axtl</code>\n<b>ETH/USDT:</b> <code>0x1fbde0d2a96869299049f4f6f78fbd789d167d1b</code>`;

            await bot.editMessageText(resposta_donate, {
                parse_mode: "HTML",
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
            await bot.editMessageText(message_start, {
                parse_mode: "HTML",
                chat_id: chatId,
                message_id: messageId,
                disable_web_page_preview: true,
                reply_markup: options_start.reply_markup,
            });
        }
    });
    bot.sendMessage(message.chat.id, message_start, options_start);
}

module.exports = {
    startCommand,
};
