const {bot} = require('../bot')
const axios = require('axios');
const cheerio = require('cheerio');
const CronJob = require('cron').CronJob;
const { ChatModel } = require('../database')
const { UserModel } = require('../database')


bot.on('message', async (msg) => {
  if (msg.chat.type === 'private') {
    const user = new UserModel({
      user_id: msg.from.id,
      username: msg.from.username,
      firstname: msg.from.first_name,
      lastname: msg.from.last_name,
    });

    try {
      await user.save();
      console.log(`User ${msg.from.id} saved to database.`);
    } catch (error) {
      console.error(`Error saving user ${msg.from.id} to database: ${error.message}`);
    }
  }
});


bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id
  const chatName = msg.chat.title


  try {
 

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






const groupId = process.env.groupId;

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const numUsers = await UserModel.countDocuments();
  const numChats = await ChatModel.countDocuments();
  const message = `\n──❑ 「 Bot Stats 」 ❑──\n\n ☆ ${numUsers} usuários\n ☆ ${numChats} chats`;
  bot.sendMessage(chatId, message);
});

// Enviar mensagem sempre que um novo usuário for salvo no banco de dados
ChatModel.on('save', (chat) => {
  const message = `#Togurosbot #New_Group
  <b>Group:</b> <a href="tg://resolve?domain=${chat.chatName}&amp;id=${chat.chatId}">${chat.chatName}</a>
  <b>ID:</b> <code>${chat.chatId}</code>`;
  bot.sendMessage(groupId, message, { parse_mode: "HTML" })
    .catch(error => {
      console.error(`Erro ao enviar mensagem para o grupo ${groupId}: ${error}`);
    });
});

bot.on('polling_error', (error) => {
  console.error(`Erro no bot de polling: ${error}`);
});










function initializeMainModule() {
  return bot;
}

module.exports = initializeMainModule;

