function helpCommand(bot, message) {
    if (message.chat.type !== 'private') {
      return;
    }
  
    const text = 'Olá! Eu sou um bot programado para enviar fatos históricos todos os dias nos horários pré-determinados de 8h, 15h e 22h. \n\nAlém disso, tenho comandos incríveis que podem ser úteis para você. Fique à vontade para interagir comigo e descobrir mais sobre o mundo que nos cerca! \n\n<b>Basta clicar em um deles:</b>';
    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Lista de Comandos',
              callback_data: 'commands'
            }
          ],
          [
            { text: 'Projetos', url: 'https://t.me/pjtlbrabo' },
            { text: 'Suporte', url: 'https://t.me/kylorensbot' }
          ]
        ]
      }
    };
  
    bot.on('callback_query', async (callbackQuery) => {
      if (callbackQuery.message.chat.type !== 'private') {
        return;
      }
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
  
      if (callbackQuery.data === 'commands') {
        const commands = [
          '/fotoshist - Fotos de fatos históricos 🙂',
        ];
        await bot.editMessageText('<b>Lista de Comandos:</b> \n\n' + commands.join('\n'), {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Voltar',
                  callback_data: 'back_to_start'
                }
              ]
            ]
          }
        });
      } else if (callbackQuery.data === 'back_to_start') { 
        await bot.editMessageText(text, {
          parse_mode: 'HTML',
          chat_id: chatId,
          message_id: messageId,
          reply_markup: options.reply_markup
        });
      }
    });
  
    bot.sendMessage(message.chat.id, text, options);
  }
  
  module.exports = {
    helpCommand
  };
  