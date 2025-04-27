
 require('dotenv').config();
const Telegram = require("node-telegram-bot-api");
const axios = require('axios');
const { SMA } = require('technicalindicators');
const dayjs = require('dayjs');
const fs = require('fs');

// Bot token from .env
const token = process.env.TEL_TOKEN;
const bot = new Telegram(token, { polling: true });
const SMA_SHORT = 10;
const SMA_LONG = 50;
// Configuration

const SYMBOLS = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","DOGEUSDT","ADAUSDT","AVAXUSDT","SHIBUSDT","DOTUSDT","TRXUSDT","MATICUSDT","LTCUSDT","BCHUSDT","LINKUSDT","ATOMUSDT","XLMUSDT","UNIUSDT","NEARUSDT",   "ICPUSDT"];

// Emoji and names
const emojiName = {
    BTCUSDT: { emoji: '🟡 ₿', name: 'Bitcoin' },
    ETHUSDT: { emoji: '🟣', name: 'Ethereum' },
    BNBUSDT: { emoji: '🪙', name: 'BNB' },
    SOLUSDT: { emoji: '🟢', name: 'Solana' },
    XRPUSDT: { emoji: '⚫', name: 'XRP' },
    DOGEUSDT: { emoji: '🟠🐶', name: 'Dogecoin' },
    ADAUSDT: { emoji: '🔵♾️', name: 'Cardano' },
    AVAXUSDT: { emoji: '🧊', name: 'Avalanche' },
    TONUSDT: { emoji: '💎', name: 'Toncoin' },
    DOTUSDT: { emoji: '🌐', name: 'Polkadot' },
    TRXUSDT: { emoji: '🎮🔺', name: 'TRON' },
    MATICUSDT: { emoji: '🟪', name: 'Polygon' },
    LINKUSDT: { emoji: '🔗', name: 'Chainlink' },
    LTCUSDT: { emoji: '⚡', name: 'Litecoin' },
    BCHUSDT: { emoji: '🟤', name: 'Bitcoin Cash' },
    SHIBUSDT: { emoji: '🟠 🦊', name: 'Shiba Inu' },
    ICPUSDT: { emoji: '🌐', name: 'Internet Computer' },
    NEARUSDT: { emoji: '🌙', name: 'NEAR Protocol' },
    APTUSDT: { emoji: '🧬', name: 'Aptos' },
    XLMUSDT: { emoji: '✨', name: 'Stellar' },
    ATOMUSDT: { emoji: '⚛️', name: 'Cosmos' },
    UNIUSDT: { emoji: '🦄', name: 'Uniswap' }
  };

// Cache for signals
let signalCache = {};

SYMBOLS.forEach(sym => {
  signalCache[sym] = { signal: "", log: "" };
});

// 📊 Fetch candles for a given symbol
async function fetchCandles(symbol) {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: symbol,
        interval: '1m',
        limit: SMA_LONG,
      }
    });

    return response.data.map(c => ({
      time: c[0],
      close: parseFloat(c[4])
    }));
  } catch (err) {
    console.error(`❌ Error fetching ${symbol}:`, err.message);
    return [];
  }
}

// 📈 Analyze candles
function analyze(candles, symbol) {
  const closes = candles.map(c => c.close);
  const shortSMA = SMA.calculate({ period: SMA_SHORT, values: closes });
  const longSMA = SMA.calculate({ period: SMA_LONG, values: closes });

  const short = shortSMA[shortSMA.length - 1];
  const long = longSMA[longSMA.length - 1];
  const latest = candles[candles.length - 1];
  const date = dayjs(latest.time).format('YYYY-MM-DD HH:mm');

  let signal = 'HOLD';
  if (short > long) signal = 'BUY';
  if (short < long) signal = 'SELL';

  const log = `${emojiName[symbol].emoji} ${emojiName[symbol].name} ==> ${date} | Price: $${latest.close} | Signal: ${signal}`;
  fs.appendFileSync('signals.log', log + '\n');
  return { log, signal };
}

// 🔁 Update all signals
async function updateAllSignals() {
  for (let i = 0; i < SYMBOLS.length; i++) {
    const symbol = SYMBOLS[i];
    
    const candles = await fetchCandles(symbol); 
    
    if (candles.length >= SMA_LONG) {
      const anzRes = analyze(candles, symbol); // ✅ pass symbol
      signalCache[symbol].signal = anzRes.signal;
      signalCache[symbol].log = anzRes.log;
    }
  }
}



setInterval(updateAllSignals,  ((3 * 60 * 1000) / 5 ) );
updateAllSignals()

// 🛠️ Bot commands
bot.setMyCommands([
  { command: "/start", description: "🏁 Start" },
  { command: "/signal", description: "📊 Get signal" },
  { command: "/about", description: "ℹ️ About this bot" }
]);

// 📩 Handle text commands
bot.on("message", (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start") {
    return bot.sendMessage(chatId, "👋 Welcome to MohBot!\nUse the menu ☰ or send /signal to begin.");
  }

  if (text === "/about") {
    return bot.sendMessage(chatId, "ℹ️ This bot analyzes crypto prices using the SMA crossover strategy. Built with Node.js and Binance API.");
  }

  if (text === "/signal") {
    return bot.sendMessage(chatId, "📊 Choose a crypto:", {
      reply_markup: {
        inline_keyboard: SYMBOLS.map(sym => [{
          text: `${emojiName[sym].emoji} ${emojiName[sym].name}`, callback_data: sym.toLowerCase()
        }])
      }
    });
  }
});

// 🎯 Handle crypto selection
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data.toUpperCase() ;
  
  const result = signalCache[data];
          
    const txt = result.log + (result.signal === "BUY" ? " 📈😃" : " 📉🤬");
   bot.sendMessage(chatId, txt);
      

  // Show menu again
  /*  bot.sendMessage(chatId, "Want to check another?", {
    reply_markup: {
      inline_keyboard: SYMBOLS.map(sym => [{
        text: `${emojiName[sym].emoji} ${emojiName[sym].name}`, callback_data: sym.toLowerCase()
      }])
    }
  });
    */
});

