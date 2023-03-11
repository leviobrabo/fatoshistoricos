const {bot} = require('../bot')

module.exports = async (msg) => {
    if (msg.chat.type === 'private') { 
    // URL da imagem
    const imageURL = 'https://i.imgur.com/MzZuN3G.jpeg';
  
    // Mensagem
    const message = 'Olá, sou fatos históricos! \n\nSou um bot que envia diáriamente mensagem com fatos históricos acontecido no dia do envio da mensagem. \n\nAdicione-me em seu grupo.';
  
    // Botões conectados à imagem
    const buttons = [
      [{ text: 'Adicione-me em seu grupo', url: 'https://t.me/climatologiabot?startgroup=true' }],
      [{ text: '👾 Canal', url: 'https://t.me/lbrabo' }, {text: '🪪 Dono', url: 'https://t.me/Kylorensbot' }],
      [{ text: 'Fazer uma doação 💰', callback_data: '/donate'}]
    ];
  
    // Enviando a mensagem com a imagem e os botões
    await bot.sendPhoto(msg.chat.id, imageURL, {
      caption: message,
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
    }
  };
  
  
  bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
  
    if (data === '/donate') {
      const usuario =  msg.from.first_name;
    const chavePix = '32dc79d2-2868-4ef0-a277-2c10725341d4';
    const banco = 'Picpay';
    const nome = 'Luzia';
  
    const resposta = `Olá, ${usuario}! \n\nContribua com qualquer valor para ajudar a manter o servidor do bot online e com mais recursos! Sua ajuda é fundamental para mantermos o bot funcionando de forma eficiente e com novas funcionalidades. \n\nPara fazer uma doação, utilize a chave PIX a seguir: \nPix: \`\`\`${chavePix}\`\`\` \nBanco: ${banco}\nNome: ${nome}\n\nObrigado pela sua contribuição! 🙌"`;
  
    bot.sendMessage(msg.chat.id, resposta, {reply_to_message_id: msg.message_id, parse_mode: 'Markdown'});
    }
  });