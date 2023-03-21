const {bot} = require('../bot')
const axios = require('axios');
const cheerio = require('cheerio');
const CronJob = require('cron').CronJob;
const { ChatModel } = require('../database')
const { UserModel } = require('../database')


const groupId = process.env.groupId;


bot.on('message', async (msg) => {
  try {
    if ((msg.chat.type === 'private' && msg.entities && msg.entities[0].type === 'bot_command') || 
        ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && msg.entities && msg.entities[0].type === 'bot_command')) {

      const existingUser = await UserModel.findOne({ user_id: msg.from.id });
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
        <b>User:</b> <a href="tg://user?id=${user.user_id}">${user.firstname}</a>
        <b>ID:</b> <code>${user.user_id}</code>
        <b>Username:</b> ${user.username ? `@${user.username}` : "Não informado"}`;
      bot.sendMessage(groupId, message, { parse_mode: "HTML" });
    }
  } catch (error) {
    console.error(`Erro em salvar o usuário ${msg.from.id} no banco de dados: ${error.message}`);
  }
});


bot.on('polling_error', (error) => {
  console.error(error);
});



bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;
  const chatName = msg.chat.title;

  try {
    const existingChat = await ChatModel.findOne({ chatId });

    if (existingChat) {
      console.log(`Chat ${chatName} (${chatId}) already exists in database.`);
      return;
    }

    const chat = await ChatModel.create({ chatId, chatName });
    console.log(`Grupo ${chat.chatName} (${chat.chatId}) adicionado ao banco de dados`);
  } catch (err) {
    console.error(err);
  }
});

bot.on('left_chat_member', async (msg) => {
  const chatId = msg.chat.id;

  try {
    const chat = await ChatModel.findOneAndDelete({ chatId });
    console.log(`Grupo ${chat.chatName} (${chat.chatId}) removido do banco de dados`);
  } catch (err) {
    console.error(err);
  }
});


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

async function sendHistoricalEventsGroup(chatId) {
  if (chatId === groupId) {
    console.log(`Mensagem não enviada para grupo ${chatId}`);
    return;
  }
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
    if (chatId !== groupId) {
        sendHistoricalEventsGroup(chatId);
      }
  }
}, null, true, 'America/Sao_Paulo');


morningJob.start();

const channelId = process.env.channelId;

async function sendHistoricalEventsChannel(channelId) {
  const events = await getHistoricalEvents();
  if (events) {
    const message = `<b>HOJE NA HISTÓRIA</b>\n\n📅 Acontecimento em <b>${day}/${month}</b>\n\n<i>${events}</i>`;
    bot.sendMessage(channelId, message, { parse_mode: 'HTML' });    
  } else {
    bot.sendMessage(channelId, '<b>Não há eventos históricos para hoje.</b>', { parse_mode: 'HTML' });
  }
}

const dailyJob = new CronJob('0 5 * * *', function() {
  sendHistoricalEventsChannel(channelId);
}, null, true, 'America/Sao_Paulo');

dailyJob.start();


bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const numUsers = await UserModel.countDocuments();
  const numChats = await ChatModel.countDocuments();
  const message = `\n──❑ 「 Bot Stats 」 ❑──\n\n ☆ ${numUsers} usuários\n ☆ ${numChats} chats`;
  bot.sendMessage(chatId, message);
});

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

