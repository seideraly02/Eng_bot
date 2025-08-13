const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('pg');
const regex = /^\+77\d{9}$/;

// PostgreSQL connection setup
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'sama1234',
  port: 5432,
};
const dbClient = new Client(dbConfig);
dbClient.connect();

// Initialize the bot
const bot = new TelegramBot(botToken, { polling: true });

// Handle /start command and messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Fetch user info from the database
  let userInfo = await getUserInfo(chatId);
  if (!userInfo) {
    userInfo = { chatId, name: null, phoneNumber: null, city: null };
  }

  if (text === '/start') {
    bot.sendMessage(chatId, 'Добро пожаловать! Пожалуйста, введите ваше имя.');
  } else {
    // Handle missing user data
    if (!userInfo.name) {
      userInfo.name = text;
      await saveUserInfo(userInfo);
      bot.sendMessage(chatId, 'Введите номер телефона в формате +77XXXXXXXXXX:');
    } else if (!userInfo.phoneNumber) {
      if (regex.test(text)) {
        userInfo.phoneNumber = text;
        await saveUserInfo(userInfo);
        bot.sendMessage(chatId, 'Введите ваш город:');
      } else {
        bot.sendMessage(chatId, 'Неправильный формат номера телефона. Пожалуйста, попробуйте снова.');
      }
    } else if (!userInfo.city) {
      userInfo.city = text;
      await saveUserInfo(userInfo);
      bot.sendMessage(
        chatId,
        `Спасибо! Вы зарегистрированы.\nИмя: ${userInfo.name}\nТелефон: ${userInfo.phoneNumber}\nГород: ${userInfo.city}\n[Перейти к JattapAll_bot](https://t.me/JattapAll_bot)`,
        { parse_mode: 'Markdown' }
      );
    } else {
      // If all data is already collected
      bot.sendMessage(chatId, 'Все ваши данные уже собраны.\n[Перейти к JattapAll_bot](https://t.me/JattapAll_bot)', {
        parse_mode: 'Markdown',
      });
    }
  }
});

// Fetch user info from the database
async function getUserInfo(chatId) {
  try {
    const query = 'SELECT first_name, phone_number, city FROM users WHERE chat_id = $1';
    const res = await dbClient.query(query, [chatId]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        chatId,
        name: row.first_name,
        phoneNumber: row.phone_number,
        city: row.city,
      };
    }
  } catch (err) {
    console.error('Error fetching user info:', err);
  }
  return null;
}

// Save user info to the database
async function saveUserInfo(userInfo) {
  try {
    const query = `
      INSERT INTO users (chat_id, first_name, phone_number, city) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (chat_id) DO UPDATE 
      SET first_name = EXCLUDED.first_name, phone_number = EXCLUDED.phone_number, city = EXCLUDED.city;
    `;
    await dbClient.query(query, [
      userInfo.chatId,
      userInfo.name || null,
      userInfo.phoneNumber || null,
      userInfo.city || null,
    ]);
  } catch (err) {
    console.error('Error saving user info:', err);
  }
}

// Handle errors
bot.on('polling_error', (error) => {
  console.error(`Polling error: ${error.code} - ${error.message}`);
});
