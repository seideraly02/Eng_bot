const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('pg');

// Initialize the bot
// const botToken = '6980232097:AAGgcYVOcYRvzamA4XluBr-SRQp5JUAO7F4';
const bot = new TelegramBot(botToken, { polling: true });

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

const pendingRequests = new Map(); // To store pending requests

// Main menu keyboard
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: 'View Users', callback_data: 'view_users' },
        { text: 'Grant Access', callback_data: 'grant_access' },
        { text: 'Revoke Access', callback_data: 'revoke_access' },
      ],
      [{ text: 'Cancel', callback_data: 'cancel' }],
    ],
  },
};

// Input keyboard
const inputKeyboard = {
  reply_markup: {
    keyboard: [['Cancel']],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome! Choose an action:', mainMenu);
});

// Handle callback queries
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const callbackData = query.data;

  switch (callbackData) {
    case 'view_users':
      const users = await getUserListFromDatabase();
      bot.sendMessage(chatId, users, mainMenu);
      break;

    case 'grant_access':
      bot.sendMessage(chatId, 'Enter the chat_id of the user to grant access:', inputKeyboard);
      pendingRequests.set(chatId, 'grant');
      break;

    case 'revoke_access':
      bot.sendMessage(chatId, 'Enter the chat_id of the user to revoke access:', inputKeyboard);
      pendingRequests.set(chatId, 'revoke');
      break;

    case 'cancel':
      if (pendingRequests.has(chatId)) {
        pendingRequests.delete(chatId);
        bot.sendMessage(chatId, 'Request canceled.', mainMenu);
      }
      break;

    default:
      bot.sendMessage(chatId, 'Unknown command. Use the menu to choose an action.', mainMenu);
      break;
  }
  bot.answerCallbackQuery(query.id); // Acknowledge callback query
});

// Handle text messages for chat_id input
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (pendingRequests.has(chatId)) {
    const requestType = pendingRequests.get(chatId);
    const [targetChatId, status] = text.split(' ');

    if (!isNaN(targetChatId) && ['active', 'inactive'].includes(status)) {
      if (requestType === 'grant') {
        await grantAccess(targetChatId);
        bot.sendMessage(chatId, `Access granted to user with chat_id ${targetChatId}.`, mainMenu);
      } else if (requestType === 'revoke') {
        const success = await revokeAccess(targetChatId);
        bot.sendMessage(
          chatId,
          success
            ? `Access revoked for user with chat_id ${targetChatId}.`
            : `Failed to revoke access for user with chat_id ${targetChatId}.`,
          mainMenu
        );
      }
      pendingRequests.delete(chatId);
    } else {
      bot.sendMessage(chatId, 'Enter valid data: <chat_id> <status (active/inactive)>.', inputKeyboard);
    }
  }
});

// Fetch user list from the database
async function getUserListFromDatabase() {
  const query = 'SELECT chat_id, first_name FROM users';
  try {
    const res = await dbClient.query(query);
    let userList = 'User List:\n';
    res.rows.forEach((row) => {
      userList += `${row.chat_id} - ${row.first_name}\n`;
    });
    userList += `\nTotal Users: ${res.rowCount}`;
    return userList;
  } catch (err) {
    console.error(err);
    return 'Failed to fetch user list.';
  }
}

// Grant access to a user
async function grantAccess(chatId) {
  const query = 'UPDATE users SET status = true, access_granted_at = NOW() WHERE chat_id = $1';
  try {
    await dbClient.query(query, [chatId]);
  } catch (err) {
    console.error(err);
  }
}

// Revoke access from a user
async function revokeAccess(chatId) {
  const query = 'UPDATE users SET status = false WHERE chat_id = $1';
  try {
    const res = await dbClient.query(query, [chatId]);
    return res.rowCount > 0;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Error handling
bot.on('polling_error', (error) => {
  console.error(`Polling error: ${error.code} - ${error.message}`);
});
