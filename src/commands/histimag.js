const historicos = [
    {
        titulo: "Policial repreende um homem em San Francisco, nos EUA, por não usar máscara durante a pandemia da Gripe de 1918 © California State Library",
        imagem: "https://i.imgur.com/8Q9OC3d.jpeg",
    },
    {
        titulo: "Familiares e amigos visitando pacientes em quarentena no hospital Ullevål, em Oslo, na Noruega, em 1905 © Anders Beer Wilse",
        imagem: "https://i.imgur.com/ifSFlsp.jpeg",
    },
    {
        titulo: "Celebração pela libertação do campo de concentração de Auschwitz, na Polônia, pelo exército soviético em 1945",
        imagem: "https://i.imgur.com/ksdeCm1.png",
    },
    {
        titulo: "Sobreviventes do famoso acidente aéreo nos Andes, em 1972, quando as pessoas tiveram de recorrer ao canibalismo para sobreviver por 72 dias na neve",
        imagem: "https://i.imgur.com/eIZC0yH.png",
    },
    {
        titulo: "Estátua de Davi, de Michelangelo, coberto por uma proteção de tijolos para impedir danos por bombardeios durante a Segunda Guerra Mundial",
        imagem: "https://i.imgur.com/PgMKq6S.png",
    },
    {
        titulo: "Famosa casa à beira da praia em San Francisco, nos EUA, em 1907, pouco tempo antes de ser destruída por um incêndio",
        imagem: "https://i.imgur.com/E3rAaKZ.png",
    },
    {
        titulo: "Histórica foto da Princesa Diana apertando a mão de um paciente de Aids sem luvas em 1991, em época que o preconceito e a ignorância ainda pautavam as noções sobre o contágio da doença",
        imagem: "https://i.imgur.com/LdsE0TS.png",
    },
    {
        titulo: "“Selfie” tirada pelo Czar Nicolau II, da Rússia, antes da revolução",
        imagem: "https://i.imgur.com/hBEu5tk.png",
    },
    {
        titulo: "Gaspar Wallnöfer, aos 79 anos em 1917, o mais velho soldado australiano durante a Primeira Guerra Mundial, que já havia lutado em batalhas na Itália em 1848 e 1866",
        imagem: "https://i.imgur.com/nYdyTjF.png",
    },
    {
        titulo: "“Night Witches”, grupo de pilotas russas que bombardeavam os nazistas em ataques noturnos, em 1941",
        imagem: "https://i.imgur.com/nK0ydXb.png",
    },
    {
        titulo: "Policiais de Las Vegas diante de Mike Tyson instantes após o lutador morder e arrancar parte da orelha de seu adversário, Evander Holyfield, em 1996",
        imagem: "https://i.imgur.com/Dw075SY.png",
    },
    {
        titulo: "O jovem Bill Clinton apertando a mão do então presidente John Kennedy na Casa Branca em 1963",
        imagem: "https://i.imgur.com/MwC2K0h.png",
    },
    {
        titulo: "Trabalhadores no alto da Torre Norte do World Trade Center, em Nova York, em 1973",
        imagem: "https://i.imgur.com/kUy0V52.png",
    },
    {
        titulo: "Antes e depois da Segunda Guerra do soldado soviético Eugen Stepanovich Kobytev: à esquerda, em 1941, no dia em que foi para a guerra, e à direita, em 1945, ao fim do conflito",
        imagem: "https://i.imgur.com/RnjY0za.png",
    },
    {
        titulo: "Soldado britânico com sua filha pequena ao voltar para casa em 1945",
        imagem: "https://i.imgur.com/EoX9JIB.png",
    },
    {
        titulo: "Cetshwayo, Rei dos Zulus, que venceu o exército britânico na batalha de Isandlwana, em 1878",
        imagem: "https://i.imgur.com/DedYfRB.png",
    },
    {
        titulo: "Propaganda anti britânica no Japão em 1941",
        imagem: "https://i.imgur.com/WFmfZBF.png",
    },
    {
        titulo: "Policial disfarçado em um dia de trabalho em Nova York, em 1969",
        imagem: "https://i.imgur.com/w0sAgsN.png",
    },
    {
        titulo: "Acrobatas no topo do Empire State, em Nova York, em 1934",
        imagem: "https://i.imgur.com/1COKRBn.png",
    },
    {
        titulo: "Estrada cruzando a neve dos Montes Pirinéus, na parte francesa, em 1956",
        imagem: "https://i.imgur.com/j6sDEOt.png",
    },
    {
        titulo: "Soldado estadunidense salvando duas crianças vietnamitas durante a Guerra do Vietnã, em 1968",
        imagem: "https://i.imgur.com/KutBakT.png",
    },
    {
        titulo: "Enfermeira da Cruz Vermelha anotando as últimas palavras de um soldado em seu leito de morte em 1917",
        imagem: "https://i.imgur.com/Y7ziMVO.png",
    },
];

async function histimag(bot, message) {
    const historicoIndex = Math.floor(Math.random() * historicos.length);
    const historico = historicos[historicoIndex];

    await bot.sendPhoto(message.chat.id, historico.imagem, {
        caption: `<b>${historico.titulo}</b>`,
        parse_mode: "HTML",
        reply_to_message_id: message.message_id,
    });
}

module.exports = {
    histimag: histimag,
};
