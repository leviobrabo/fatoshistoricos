<img src="https://i.imgur.com/OQKrs8P.jpeg" align="right" width="200" height="200"/>

# Fatos Históricos
[![](https://img.shields.io/badge/Telegram-@fatoshistbot-blue)](https://t.me/fatoshistbot)
[![](https://img.shields.io/badge/Suporte-@kylorensbot-1b2069)](https://t.me/kylorensbot)
[![](https://img.shields.io/badge/Telegram-@HojeNaHistoria-red)](https://t.me/hoje_na_historia)



[Fatos Históricos](https://t.me/hoje_na_historia) é um bot para telegram que tem como objetivo propagar o conhecimento de história e bem como levar o conhecimento de forma "leve" e "tranquila" para todo o público.

## Funcionalidades

* Envia eventos históricos do dia
  - Chat privado (8h)
  - Canal (5h3min)
  - Grupos (8h)
  
* Envia frases históricas
* Envia Feriados do dia
* Envia Nascido do dia
* Envia mortos do dia
* Envia imagens de eventos históricos
  - Chat privado
  - Canal
  - Grupos
    
* Envia curiosidade históricas
* Envia data comemorativas



[![](https://i.imgur.com/MzZuN3G.jpeg)](#)

### Pré-requisitos

Você vai precisar ter instalado em sua máquina as seguintes ferramentas:

-   [Git](https://git-scm.com)
-   [Node.js](https://nodejs.org/en/)
-   [MongoDB](https://cloud.mongodb.com/)
-   [WIKIMEDIA](https://api.wikimedia.org/wiki/Feed_API/Reference/On_this_day)

### 🤖 Deploy no Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### 🤖 Rodando o bot localmente

```bash
# Clone este repositório
$ git clone https://github.com/leviobrabo/fatoshistoricos.git

# Acesse a pasta do projeto no terminal/cmd
$ cd fatoshistoricos

# Instale as dependências

# Usando o NPM:
$ npm i

# Variáveis ambientes

# Crie um arquivo com .env com qualquer editor de texto e coloque:
DB_STRING=#URL de conexão com o MongoDB
TELEGRAM_API=#Token do seu bot gerado no @BotFather
groupId=#ID GROUP LOG
channelId=#ID CHANNEL POST
ownerId‎=#ID_DEV // userId1,userId2,userId3
channelStatusId‎=ID CANAL DE STATUS
# Execute a aplicação
$ npm start

```

## Pronto, o bot já estará rodando
