require('dotenv').config();
const telegram = require("node-telegram-bot-api");
const token = process.env.TEL_TOKEN;

const bot = new telegram(token , {polling: true});

bot.on("message" , (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;

    if("/start" === text) {
        bot.sendMessage(chatId, '👋 Welcome to your Trading Bot! Send /signal to get a trade suggestion.');
    }
    if("/signal" === text){
        bot.sendMessage(chatId, '📈');
    }

})

// if you use ngrok
// use the directory like ~/app/ngrok http port