# Fatos Históricos 
## Bot que envia fatos históricos do dia

[![](https://img.shields.io/badge/Telegram-@fatoshistbot-blue)](https://t.me/fatoshistbot)
[![](https://img.shields.io/badge/Suporte-@kylorensbot-1b2069)](https://t.me/kylorensbot)
[![](https://i.imgur.com/MzZuN3G.jpeg)](#)

### Pré-requisitos

Você vai precisar ter instalado em sua máquina as seguintes ferramentas:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en/)
- [MongoDB](https://cloud.mongodb.com/)

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
TELEGRAM_API=Token do seu bot gerado no @BotFather
groupId=ID GROUP LOG
channelId=ID CHANNEL POST

# Execute a aplicação
$ npm start

```

## Pronto, o bot já estará rodando
