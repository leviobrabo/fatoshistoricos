const historicos = [
    { titulo: 'Policial repreende um homem em San Francisco, nos EUA, por não usar máscara durante a pandemia da Gripe de 1918 © California State Library', imagem: 'https://i.imgur.com/8Q9OC3d.jpeg'},
    { titulo: 'Familiares e amigos visitando pacientes em quarentena no hospital Ullevål, em Oslo, na Noruega, em 1905 © Anders Beer Wilse', imagem: 'https://i.imgur.com/ifSFlsp.jpeg'},
  ];
  
  async function histimag(bot, message) {
  
    const historicoIndex = Math.floor(Math.random() * historicos.length);
    const historico = historicos[historicoIndex];
  
    await bot.sendPhoto(message.chat.id, historico.imagem, { 
      caption: `<b>${historico.titulo}</b>`,
      parse_mode: 'HTML',
      reply_to_message_id: message.message_id 
    });
  }
  
  module.exports = {
    histimag: histimag
  };