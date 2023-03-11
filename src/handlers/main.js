const {bot} = require('../bot')
const axios = require('axios');
const cheerio = require('cheerio');
const CronJob = require('cron').CronJob;
const { ChatModel } = require('../database')


bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id
  const chatName = msg.chat.title
    const thankYouMessage = `Olá a todos! Obrigado por me adicionar a este grupo. \n\nEu enviarei uma lista de acontecimentos históricos ocorridos no dia, diariamente às 8h, 15h e 22h. 😊`


  try {
  
        await bot.sendMessage(chatId, thankYouMessage)

    // Armazena o grupo no banco de dados
    const chat = await ChatModel.create({ chatId, chatName })
    console.log(`Grupo ${chat.chatName} (${chat.chatId}) adicionado ao banco de dados`)
  } catch (err) {
    console.error(err)
  }
})

bot.on('left_chat_member', async (msg) => {
  const chatId = msg.chat.id

  try {
    // Remove o grupo do banco de dados
    const chat = await ChatModel.findOneAndDelete({ chatId })
    console.log(`Grupo ${chat.chatName} (${chat.chatId}) removido do banco de dados`)
  } catch (err) {
    console.error(err)
  }
})

let day, month;

async function getHistoricalEvents() {
  const today = new Date();
  day = today.getDate();
  month = today.getMonth() + 1;

  const response = await axios.get(`https://www.educabras.com/hoje_na_historia/buscar/${day}/${month}`);
  const $ = cheerio.load(response.data);
  const eventDiv = $('.nascido_neste_dia');
  let eventText = eventDiv.text().trim();

  return eventText;
}

// Função para enviar a mensagem para o grupo
async function sendHistoricalEvents(chatId) {
  const events = await getHistoricalEvents();

  if (events) {
    const message = `<b>HOJE NA HISTÓRIA</b>\n\n📅 Acontecimento em <b>${day}/${month}</b>\n\n<i>${events}</i>`;
    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });    
  } else {
    bot.sendMessage(chatId, '<b>Não há eventos históricos para hoje.</b>', { parse_mode: 'HTML' });   
  }
}

const morningJob = new CronJob('0 8 * * *', async function() {
  const chatModels = await ChatModel.find({});
  for (const chatModel of chatModels) {
    const chatId = chatModel.chatId;
    sendHistoricalEvents(chatId);
  }
}, null, true, 'America/Sao_Paulo');

const eveningJob = new CronJob('0 15 * * *', async function() {
  const chatModels = await ChatModel.find({});
  for (const chatModel of chatModels) {
    const chatId = chatModel.chatId;
    sendHistoricalEvents(chatId);
  }
}, null, true, 'America/Sao_Paulo');

const nightJob  = new CronJob('0 22 * * *', async function() {
  const chatModels = await ChatModel.find({});
  for (const chatModel of chatModels) {
    const chatId = chatModel.chatId;
    sendHistoricalEvents(chatId);
  }
}, null, true, 'America/Sao_Paulo');

morningJob.start();
eveningJob.start();
nightJob.start();






// Comando /stats
bot.onText(/\/stats/, async (msg, match) => {
  try {
    const count = await ChatModel.countDocuments()
    const message = `\n──❑ 「 Bot Stats 」 ❑──\n\n ☆ Groups: ${count}`
    bot.sendMessage(msg.chat.id, message)
  } catch (error) {
    console.error(error)
    bot.sendMessage(msg.chat.id, 'Ocorreu um erro ao buscar as estatísticas do bot.')
  }
})

bot.on('polling_error', (error) => {
  console.error(error)
})









function initializeMainModule() {
  return bot;
}

module.exports = initializeMainModule;

