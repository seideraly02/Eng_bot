require('dotenv').config(); // Загружаем переменные окружения из .env

const TelegramBot = require('node-telegram-bot-api');
const { handleUpdateAsync, handleErrorAsync } = require('./modules/MessageHandler');

// Берём токен из .env
const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error('Ошибка: Токен бота не найден в .env');
  process.exit(1);
}

const bot = new TelegramBot(botToken, { polling: true });

(async () => {
  try {
    const botInfo = await bot.getMe();
    console.log(`Бот ${botInfo.username} успешно запущен.`);
  } catch (error) {
    console.error('Ошибка при инициализации бота:', error.message);
    process.exit(1);
  }
})();

// Обработка обычных сообщений
bot.on('message', async (msg) => {
  try {
    await handleUpdateAsync(bot, { message: msg });
  } catch (err) {
    console.error('Ошибка при обработке сообщения:', err.stack || err.message);
    await handleErrorAsync(bot, err);
  }
});

// Обработка нажатий на inline-кнопки
bot.on('callback_query', async (query) => {
  try {
    await handleUpdateAsync(bot, { callback_query: query });
  } catch (err) {
    console.error('Ошибка при обработке callback_query:', err.stack || err.message);
    await handleErrorAsync(bot, err);
  }
});

bot.on('polling_error', (error) => {
  console.error(`Ошибка опроса сервера: ${error.code} - ${error.message}`);
});

module.exports = bot;
