const { bot } = require("../bot");
const axios = require("axios");
const cheerio = require("cheerio");
const CronJob = require("cron").CronJob;
const { ChatModel } = require("../database");
const { UserModel } = require("../database");

const groupId = process.env.groupId;

bot.on("message", async (msg) => {
    try {
        if (
            (msg.chat.type === "private" &&
                msg.entities &&
                msg.entities[0].type === "bot_command") ||
            ((msg.chat.type === "group" || msg.chat.type === "supergroup") &&
                msg.entities &&
                msg.entities[0].type === "bot_command")
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
            });

            await user.save();
            console.log(`Usuário ${msg.from.id} salvo no banco de dados.`);

            const message = `#Fatoshistbot #New_User
        <b>User:</b> <a href="tg://user?id=${user.user_id}">${
                user.firstname
            }</a>
        <b>ID:</b> <code>${user.user_id}</code>
        <b>Username:</b> ${
            user.username ? `@${user.username}` : "Não informado"
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
        const existingChat = await ChatModel.findOne({ chatId });

        if (existingChat) {
            console.log(
                `Chat ${chatName} (${chatId}) already exists in database.`
            );
            return;
        }

        const chat = await ChatModel.create({ chatId, chatName });
        console.log(
            `Grupo ${chat.chatName} (${chat.chatId}) adicionado ao banco de dados`
        );
    } catch (err) {
        console.error(err);
    }
});

bot.on("left_chat_member", async (msg) => {
    const chatId = msg.chat.id;

    try {
        const chat = await ChatModel.findOneAndDelete({ chatId });
        console.log(
            `Grupo ${chat.chatName} (${chat.chatId}) removido do banco de dados`
        );
    } catch (err) {
        console.error(err);
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

    if (events) {
        const message = `<b>HOJE NA HISTÓRIA</b>\n\n📅 Acontecimento em <b>${day}/${month}</b>\n\n<i>${events}</i>`;
        bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } else {
        bot.sendMessage(chatId, "<b>Não há eventos históricos para hoje.</b>", {
            parse_mode: "HTML",
        });
    }
}

const morningJob = new CronJob(
    "0 8 * * *",
    async function () {
        const chatModels = await ChatModel.find({});
        for (const chatModel of chatModels) {
            const chatId = chatModel.chatId;
            sendHistoricalEventsGroup(chatId);
        }
    },
    null,
    true,
    "America/Sao_Paulo"
);

morningJob.start();

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

const dailyJob = new CronJob(
    "0 5 * * *",
    function () {
        sendHistoricalEventsChannel(channelId);
    },
    null,
    true,
    "America/Sao_Paulo"
);

dailyJob.start();

const presidents = [
    {
        id_presi: 1,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Luiz Inácio Lula da Silva",
        inform: "39º e 35º presidente do Brasil",
        partido: "Partido dos Trabalhadores (PT)",
        anoDeMandato: "2003 - 2010",
    },
    {
        id_presi: 2,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Jair Bolsonaro",
        inform: "38º presidente do Brasil",
        partido: "Partido Social Liberal (PSL)",
        anoDeMandato: "2019 - atualmente",
    },
    {
        id_presi: 3,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Michel Temer",
        inform: "37º presidente do Brasil",
        partido: "Movimento Democrático Brasileiro (MDB)",
        anoDeMandato: "2016 - 2018",
    },
    {
        id_presi: 4,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Dilma Rousseff",
        inform: "36ª presidente do Brasil",
        partido: "Partido dos Trabalhadores (PT)",
        anoDeMandato: "2011 - 2016",
    },
    {
        id_presi: 5,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Luiz Inácio Lula da Silva",
        inform: "35º presidente do Brasil",
        partido: "Partido dos Trabalhadores (PT)",
        anoDeMandato: "2003 - 2010",
    },
    {
        id_presi: 6,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Fernando Collor de Mello",
        inform: "34º presidente do Brasil",
        partido: "Partido da Reconstrução Nacional (PRN)",
        anoDeMandato: "1990 - 1992",
    },
    {
        id_presi: 7,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "José Sarney",
        inform: "33º presidente do Brasil",
        partido: "Partido do Movimento Democrático Brasileiro (PMDB)",
        anoDeMandato: "1985 - 1990",
    },
    {
        id_presi: 8,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Tancredo Neves",
        inform: "Eleito presidente, não tomou posse",
        partido: "Partido do Movimento Democrático Brasileiro (PMDB)",
        anoDeMandato: "1985",
    },
    {
        id_presi: 9,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "João Figueiredo",
        inform: "30º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1979 - 1985",
    },
    {
        id_presi: 10,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Ernesto Geisel",
        inform: "29º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1974 - 1979",
    },
    {
        id_presi: 11,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Emílio Garrastazu Médici",
        inform: "28º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1969 - 1974",
    },
    {
        id_presi: 12,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Artur da Costa e Silva",
        inform: "27º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1967 - 1969",
    },
    {
        id_presi: 13,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Humberto de Alencar Castelo Branco",
        inform: "26º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1964 - 1967",
    },
    {
        id_presi: 14,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "João Goulart",
        inform: "25º presidente do Brasil",
        partido: "Partido Trabalhista Brasileiro (PTB)",
        anoDeMandato: "1961 - 1964",
    },
    {
        id_presi: 15,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Jânio Quadros",
        inform: "24º presidente do Brasil",
        partido: "Partido Trabalhista Nacional (PTN)",
        anoDeMandato: "1961",
    },
    {
        id_presi: 16,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Juscelino Kubitschek",
        inform: "23º presidente do Brasil",
        partido: "Partido Social Democrático (PSD)",
        anoDeMandato: "1956 - 1961",
    },
    {
        id_presi: 17,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Getúlio Vargas",
        inform: "20º e 24º presidente do Brasil",
        partido: "Aliança Liberal",
        anoDeMandato: "1930 - 1945, 1951 - 1954",
    },
    {
        id_presi: 18,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Café Filho",
        inform: "19º presidente do Brasil",
        partido: "Partido Social Democrático (PSD)",
        anoDeMandato: "1954 - 1955",
    },
    {
        id_presi: 19,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Eurico Gaspar Dutra",
        inform: "18º presidente do Brasil",
        partido: "Partido Social Democrático (PSD)",
        anoDeMandato: "1946 - 1951",
    },
    {
        id_presi: 20,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Getúlio Vargas",
        inform: "17º presidente do Brasil",
        partido: "Partido Trabalhista Brasileiro (PTB)",
        anoDeMandato: "1951",
    },
    {
        id_presi: 21,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Eurico Gaspar Dutra",
        inform: "16º presidente do Brasil",
        partido: "Partido Social Democrático (PSD)",
        anoDeMandato: "1946",
    },
    {
        id_presi: 22,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "José Linhares",
        inform: "15º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1945 - 1946",
    },
    {
        id_presi: 23,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Getúlio Vargas",
        inform: "14º presidente do Brasil",
        partido: "Aliança Liberal",
        anoDeMandato: "1934 - 1945",
    },
    {
        id_presi: 24,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Getúlio Vargas",
        inform: "13º presidente do Brasil",
        partido: "Partido Republicano Paulista (PRP)",
        anoDeMandato: "1930 - 1934",
    },
    {
        id_presi: 25,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Washington Luís",
        inform: "12º presidente do Brasil",
        partido: "Partido Republicano Paulista (PRP)",
        anoDeMandato: "1926 - 1930",
    },
    {
        id_presi: 26,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Artur Bernardes",
        inform: "11º presidente do Brasil",
        partido: "Partido Republicano Mineiro (PRM)",
        anoDeMandato: "1922 - 1926",
    },
    {
        id_presi: 27,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Epitácio Pessoa",
        inform: "10º presidente do Brasil",
        partido: "Partido Republicano Conservador (PRC)",
        anoDeMandato: "1919 - 1922",
    },
    {
        id_presi: 28,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Delfim Moreira",
        inform: "9º presidente do Brasil",
        partido: "Partido Republicano Conservador (PRC)",
        anoDeMandato: "1919 - 1922",
    },
    {
        id_presi: 29,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Venceslau Brás",
        inform: "8º presidente do Brasil",
        partido: "Partido Republicano Mineiro (PRM)",
        anoDeMandato: "1914 - 1918",
    },
    {
        id_presi: 30,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Hermes da Fonseca",
        inform: "7º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1910 - 1914",
    },
    {
        id_presi: 31,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Nilo Peçanha",
        inform: "6º presidente do Brasil",
        partido: "Partido Republicano Fluminense (PRF)",
        anoDeMandato: "1909 - 1910",
    },
    {
        id_presi: 32,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Afonso Pena",
        inform: "5º presidente do Brasil",
        partido: "Partido Republicano Mineiro (PRM)",
        anoDeMandato: "1906 - 1909",
    },
    {
        id_presi: 33,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Rodrigues Alves",
        inform: "4º presidente do Brasil",
        partido: "Partido Republicano Paulista (PRP)",
        anoDeMandato: "1902 - 1906",
    },
    {
        id_presi: 34,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Campos Sales",
        inform: "3º presidente do Brasil",
        partido: "Partido Republicano Paulista (PRP)",
        anoDeMandato: "1898 - 1902",
    },
    {
        id_presi: 35,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Prudente de Morais",
        inform: "2º presidente do Brasil",
        partido: "Partido Republicano Mineiro (PRM)",
        anoDeMandato: "1894 - 1898",
    },
    {
        id_presi: 36,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Marechal Floriano Peixoto",
        inform: "2º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1891 - 1894",
    },
    {
        id_presi: 37,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Deodoro da Fonseca",
        inform: "1º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1889 - 1891",
    },
    {
        id_presi: 37,
        titulo: "Presidente do Brasil 🇧🇷",
        nome: "Deodoro da Fonseca",
        inform: "1º presidente do Brasil",
        partido: "Sem partido",
        anoDeMandato: "1889 - 1891",
    },
    {
        id_presi: 38,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "George Washington",
        inform: "1º presidente do EUA",
        partido: "Sem afiliação partidária",
        anoDeMandato: "1789-1797",
    },
    {
        id_presi: 39,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "John Adams",
        inform: "2º presidente do EUA",
        partido: "Federalista",
        anoDeMandato: "1797-1801",
    },
    {
        id_presi: 40,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Thomas Jefferson",
        inform: "3º presidente do EUA",
        partido: "Republicano-Democrata",
        anoDeMandato: "1801-1809",
    },
    {
        id_presi: 41,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "James Madison",
        inform: "4º presidente do EUA",
        partido: "Republicano-Democrata",
        anoDeMandato: "1809-1817",
    },
    {
        id_presi: 42,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "James Monroe",
        inform: "5º presidente do EUA",
        partido: "Republicano-Democrata",
        anoDeMandato: "1817-1825",
    },
    {
        id_presi: 43,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "John Quincy Adams",
        inform: "6º presidente do EUA",
        partido: "Republicano-Democrata",
        anoDeMandato: "1825-1829",
    },
    {
        id_presi: 44,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Andrew Jackson",
        inform: "7º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1829-1837",
    },
    {
        id_presi: 45,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Martin Van Buren",
        inform: "8º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1837-1841",
    },
    {
        id_presi: 46,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "William Henry Harrison",
        inform: "9º presidente do EUA",
        partido: "Whig",
        anoDeMandato: "1841",
    },
    {
        id_presi: 47,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "John Tyler",
        inform: "10º presidente do EUA",
        partido: "Sem afiliação partidária",
        anoDeMandato: "1841-1845",
    },
    {
        id_presi: 48,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "James K. Polk",
        inform: "11º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1845-1849",
    },
    {
        id_presi: 49,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Zachary Taylor",
        inform: "12º presidente do EUA",
        partido: "Whig",
        anoDeMandato: "1849-1850",
    },
    {
        id_presi: 50,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Millard Fillmore",
        inform: "13º presidente do EUA",
        partido: "Whig",
        anoDeMandato: "1850-1853",
    },
    {
        id_presi: 51,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Franklin Pierce",
        inform: "14º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1853-1857",
    },
    {
        id_presi: 52,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "James Buchanan",
        inform: "15º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1857-1861",
    },
    {
        id_presi: 53,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Abraham Lincoln",
        inform: "16º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1861-1865",
    },
    {
        id_presi: 54,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Andrew Johnson",
        inform: "17º presidente do EUA",
        partido: "Democrata (União Nacional)",
        anoDeMandato: "1865-1869",
    },
    {
        id_presi: 55,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Ulysses S. Grant",
        inform: "18º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1869-1877",
    },
    {
        id_presi: 56,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Rutherford B. Hayes",
        inform: "19º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1877-1881",
    },
    {
        id_presi: 57,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "James A. Garfield",
        inform: "20º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1881",
    },
    {
        id_presi: 58,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Chester A. Arthur",
        inform: "21º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1881-1885",
    },
    {
        id_presi: 59,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Grover Cleveland",
        inform: "22º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1885-1889",
    },
    {
        id_presi: 60,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Benjamin Harrison",
        inform: "23º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1889-1893",
    },
    {
        id_presi: 61,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Grover Cleveland",
        inform: "24º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1893-1897",
    },
    {
        id_presi: 62,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "William McKinley",
        inform: "25º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1897-1901",
    },
    {
        id_presi: 63,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Theodore Roosevelt",
        inform: "26º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1901-1909",
    },
    {
        id_presi: 64,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "William Howard Taft",
        inform: "27º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1909-1913",
    },
    {
        id_presi: 65,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Woodrow Wilson",
        inform: "28º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1913-1921",
    },
    {
        id_presi: 66,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Warren G. Harding",
        inform: "29º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1921-1923",
    },
    {
        id_presi: 67,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Calvin Coolidge",
        inform: "30º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1923-1929",
    },
    {
        id_presi: 68,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Herbert Hoover",
        inform: "31º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1929-1933",
    },
    {
        id_presi: 69,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Franklin D. Roosevelt",
        inform: "32º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1933-1945",
    },
    {
        id_presi: 70,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Harry S. Truman",
        inform: "33º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1945-1953",
    },
    {
        id_presi: 71,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Dwight D. Eisenhower",
        inform: "34º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1953-1961",
    },
    {
        id_presi: 72,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "John F. Kennedy",
        inform: "35º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1961-1963",
    },
    {
        id_presi: 73,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Lyndon B. Johnson",
        inform: "36º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1963-1969",
    },
    {
        id_presi: 74,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Richard Nixon",
        inform: "37º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1969-1974",
    },
    {
        id_presi: 75,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Gerald Ford",
        inform: "38º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1974-1977",
    },
    {
        id_presi: 76,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Jimmy Carter",
        inform: "39º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1977-1981",
    },
    {
        id_presi: 77,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Ronald Reagan",
        inform: "40º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1981-1989",
    },
    {
        id_presi: 77,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Ronald Reagan",
        inform: "40º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1981-1989",
    },
    {
        id_presi: 78,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "George H. W. Bush",
        inform: "41º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "1989-1993",
    },
    {
        id_presi: 79,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Bill Clinton",
        inform: "42º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "1993-2001",
    },
    {
        id_presi: 80,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "George W. Bush",
        inform: "43º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "2001-2009",
    },
    {
        id_presi: 81,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Barack Obama",
        inform: "44º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "2009-2017",
    },
    {
        id_presi: 82,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Donald Trump",
        inform: "45º presidente do EUA",
        partido: "Republicano",
        anoDeMandato: "2017-2021",
    },
    {
        id_presi: 83,
        titulo: "Presidente do EUA 🇺🇸",
        nome: "Joe Biden",
        inform: "46º presidente do EUA",
        partido: "Democrata",
        anoDeMandato: "2021-Atualidade",
    },
    {
        id_presi: 84,
        titulo: "Presidente da Rússia 🇷🇺",
        nome: "Boris Yeltsin",
        inform: "1º presidente da Rússia",
        partido: "Sem partido",
        anoDeMandato: "1991-1999",
    },
    {
        id_presi: 85,
        titulo: "Presidente da Rússia 🇷🇺",
        nome: "Vladimir Putin",
        inform: "2º mandato como presidente da Rússia",
        partido: "Independente",
        anoDeMandato: "2000-2008",
    },
    {
        id_presi: 86,
        titulo: "Presidente da Rússia 🇷🇺",
        nome: "Dmitry Medvedev",
        inform: "3º presidente da Rússia",
        partido: "Rússia Unida",
        anoDeMandato: "2008-2012",
    },
    {
        id_presi: 87,
        titulo: "Presidente da Rússia 🇷🇺",
        nome: "Vladimir Putin",
        inform: "4º mandato como presidente da Rússia",
        partido: "Rússia Unida",
        anoDeMandato: "2012-2018",
    },
    {
        id_presi: 88,
        titulo: "Presidente da Rússia 🇷🇺",
        nome: "Vladimir Putin",
        inform: "5º mandato como presidente da Rússia",
        partido: "Rússia Unida",
        anoDeMandato: "2018-Atualidade",
    },
    {
        id_presi: 89,
        titulo: "Presidente da China 🇨🇳",
        nome: "Mao Zedong",
        inform: "1º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1949-1959",
    },
    {
        id_presi: 90,
        titulo: "Presidente da China 🇨🇳",
        nome: "Liu Shaoqi",
        inform: "2º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1959-1968",
    },
    {
        id_presi: 91,
        titulo: "Presidente da China 🇨🇳",
        nome: "Dong Biwu",
        inform: "3º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1968-1972",
    },
    {
        id_presi: 92,
        titulo: "Presidente da China 🇨🇳",
        nome: "Song Qingling",
        inform: "4º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1972-1975",
    },
    {
        id_presi: 93,
        titulo: "Presidente da China 🇨🇳",
        nome: "Li Xiannian",
        inform: "5º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1983-1988",
    },
    {
        id_presi: 94,
        titulo: "Presidente da China 🇨🇳",
        nome: "Yang Shangkun",
        inform: "6º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1988-1993",
    },
    {
        id_presi: 95,
        titulo: "Presidente da China 🇨🇳",
        nome: "Jiang Zemin",
        inform: "7º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "1993-2003",
    },
    {
        id_presi: 96,
        titulo: "Presidente da China 🇨🇳",
        nome: "Hu Jintao",
        inform: "8º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "2003-2013",
    },
    {
        id_presi: 97,
        titulo: "Presidente da China 🇨🇳",
        nome: "Xi Jinping",
        inform: "9º presidente da República Popular da China",
        partido: "Partido Comunista da China",
        anoDeMandato: "2013-Atualidade",
    },
    {
        id_presi: 98,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Robert Walpole",
        inform: "1º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1721-1742",
    },
    {
        id_presi: 99,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Spencer Compton",
        inform: "2º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1742-1743",
    },
    {
        id_presi: 100,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Henry Pelham",
        inform: "3º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1743-1754",
    },
    {
        id_presi: 101,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Thomas Pelham-Holles",
        inform: "4º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1754-1756",
    },
    {
        id_presi: 102,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Pitt, o Velho",
        inform: "5º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1756-1768",
    },
    {
        id_presi: 103,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Augustus FitzRoy",
        inform: "6º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1768-1770",
    },
    {
        id_presi: 104,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Frederick North",
        inform: "7º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1770-1782",
    },
    {
        id_presi: 105,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Charles Watson-Wentworth",
        inform: "8º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1782",
    },
    {
        id_presi: 106,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Petty",
        inform: "9º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1782-1783",
    },
    {
        id_presi: 107,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Cavendish-Bentinck",
        inform: "10º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1783",
    },
    {
        id_presi: 108,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Pitt, o Jovem",
        inform: "11º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1783-1801",
    },
    {
        id_presi: 109,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Henry Addington",
        inform: "12º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1801-1804",
    },
    {
        id_presi: 110,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Pitt, o Jovem",
        inform: "13º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1804-1806",
    },
    {
        id_presi: 111,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Wyndham Grenville",
        inform: "14º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1806-1807",
    },
    {
        id_presi: 112,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Cavendish-Bentinck",
        inform: "15º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1807-1809",
    },
    {
        id_presi: 113,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Spencer Perceval",
        inform: "16º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1809-1812",
    },
    {
        id_presi: 114,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Robert Jenkinson",
        inform: "17º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1812-1827",
    },
    {
        id_presi: 115,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "George Canning",
        inform: "18º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1827",
    },
    {
        id_presi: 116,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Frederick John Robinson",
        inform: "19º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1827-1828",
    },
    {
        id_presi: 117,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Arthur Wellesley",
        inform: "20º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1828-1830",
    },
    {
        id_presi: 117,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "George Hamilton-Gordon",
        inform: "21º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1830-1834",
    },
    {
        id_presi: 118,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Arthur Wellesley",
        inform: "22º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1834",
    },
    {
        id_presi: 119,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Robert Peel",
        inform: "23º primeiro-ministro da Inglaterra",
        partido: "Tory",
        anoDeMandato: "1834-1835",
    },
    {
        id_presi: 120,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "William Lamb",
        inform: "24º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1835-1841",
    },
    {
        id_presi: 121,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Robert Peel",
        inform: "25º primeiro-ministro da Inglaterra",
        partido: "Conservador",
        anoDeMandato: "1841-1846",
    },
    {
        id_presi: 122,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "John Russell",
        inform: "26º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1846-1852",
    },
    {
        id_presi: 123,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Edward Smith-Stanley",
        inform: "27º primeiro-ministro da Inglaterra",
        partido: "Conservative",
        anoDeMandato: "1852-1855",
    },
    {
        id_presi: 124,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "George Hamilton-Gordon",
        inform: "28º primeiro-ministro da Inglaterra",
        partido: "Whig",
        anoDeMandato: "1855-1858",
    },
    {
        id_presi: 125,
        titulo: "Primeiro-ministro do Reino Unido 🇬🇧",
        nome: "Edward Smith-Stanley",
        inform: "29º primeiro-ministro da Inglaterra",
        partido: "Conservative",
        anoDeMandato: "1858-1859",
    },
    {
        id_presi: 126,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Chaim Weizmann",
        inform: "Chaim Weizmann foi o primeiro presidente de Israel, servindo de 1949 a 1952. Antes de se tornar presidente, Weizmann desempenhou um papel fundamental no estabelecimento do Estado de Israel, atuando como líder do movimento sionista e como o primeiro presidente da Agência Judaica.",
        partido: "Não filiado",
        anoDeMandato: "1949-1952",
    },
    {
        id_presi: 127,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Chaim Weizmann",
        inform: "2º presidente do Israel, serviu entre 1949-1952",
        partido: "",
        anoDeMandato: "1949-1952",
    },
    {
        id_presi: 128,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Yitzhak Ben-Zvi",
        inform: "3º presidente do Israel, serviu entre 1952-1963",
        partido: "",
        anoDeMandato: "1952-1963",
    },
    {
        id_presi: 129,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Zalman Shazar",
        inform: "4º presidente do Israel, serviu entre 1963-1973",
        partido: "",
        anoDeMandato: "1963-1973",
    },
    {
        id_presi: 130,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Ephraim Katzir",
        inform: "5º presidente do Israel, serviu entre 1973-1978",
        partido: "",
        anoDeMandato: "1973-1978",
    },
    {
        id_presi: 131,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Yitzhak Navon",
        inform: "6º presidente do Israel, serviu entre 1978-1983",
        partido: "",
        anoDeMandato: "1978-1983",
    },
    {
        id_presi: 132,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Chaim Herzog",
        inform: "7º presidente do Israel, serviu entre 1983-1993",
        partido: "",
        anoDeMandato: "1983-1993",
    },
    {
        id_presi: 133,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Ezer Weizman",
        inform: "8º presidente do Israel, serviu entre 1993-2000",
        partido: "",
        anoDeMandato: "1993-2000",
    },
    {
        id_presi: 134,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Moshe Katsav",
        inform: "9º presidente do Israel, serviu entre 2000-2007",
        partido: "",
        anoDeMandato: "2000-2007",
    },
    {
        id_presi: 135,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Shimon Peres",
        inform: "10º presidente do Israel, serviu entre 2007-2014",
        partido: "",
        anoDeMandato: "2007-2014",
    },
    {
        id_presi: 136,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Reuven Rivlin",
        inform: "11º presidente do Israel, serviu entre 2014-2021",
        partido: "",
        anoDeMandato: "2014-2021",
    },
    {
        id_presi: 137,
        titulo: "Presidente do Israel 🇮🇱",
        nome: "Isaac Herzog",
        inform: "12º presidente do Israel, assumiu em julho de 2021",
        partido: "Partido Trabalhista",
        anoDeMandato: "2021-presente",
    },
];

function sendPresidentChannel(president) {
    bot.sendMessage(
        channelId,
        `<b>${president.titulo}</b>\n\n<b>Nome:</b> ${president.nome}\n<b>Informações:</b> ${president.inform}\n<b>Partido:</b> ${president.partido}\n<b>Ano de Mandato:</b> ${president.anoDeMandato}`,
        { parse_mode: "HTML" }
    );
}

let index = 0;

const presiJob = new CronJob(
    "0 40 21 * * *",
    function () {
        const president = presidents[index];
        sendPresidentChannel(president);

        index++;
        if (index >= presidents.length) {
            index = 0;
        }
    },
    null,
    true,
    "America/Sao_Paulo"
);

presiJob.start();

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const numUsers = await UserModel.countDocuments();
    const numChats = await ChatModel.countDocuments();

    const message = `\n──❑ 「 Bot Stats 」 ❑──\n\n ☆ ${numUsers} usuários\n ☆ ${numChats} chats`;
    bot.sendMessage(chatId, message);
});

ChatModel.on("save", (chat) => {
    const message = `#Togurosbot #New_Group
  <b>Group:</b> <a href="tg://resolve?domain=${chat.chatName}&amp;id=${chat.chatId}">${chat.chatName}</a>
  <b>ID:</b> <code>${chat.chatId}</code>`;
    bot.sendMessage(groupId, message, { parse_mode: "HTML" }).catch((error) => {
        console.error(
            `Erro ao enviar mensagem para o grupo ${groupId}: ${error}`
        );
    });
});

bot.on("polling_error", (error) => {
    console.error(`Erro no bot de polling: ${error}`);
});

function initializeMainModule() {
    return bot;
}

module.exports = initializeMainModule;
