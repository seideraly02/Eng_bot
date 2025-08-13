const { Client } = require('pg');

// Database connection configuration
const connectionString = 'postgres://postgres:sama1234@localhost:5432/postgres';

// Check if the user is authorized
async function isUserAuthorized(chatId) {
  const dbClient = new Client({ connectionString });
  await dbClient.connect();

  try {
    const query = 'SELECT COUNT(*) FROM users WHERE chat_id = $1';
    const res = await dbClient.query(query, [chatId]);

    const count = parseInt(res.rows[0].count, 10); // Convert result to an integer
    return count > 0; // Return true if the user exists
  } catch (err) {
    console.error('Error checking user authorization:', err);
    throw err;
  } finally {
    await dbClient.end();
  }
}

// Register a new user
async function registerUser(chatId, username) {
  const dbClient = new Client({ connectionString });
  await dbClient.connect();

  try {
    const query = 'INSERT INTO users (chat_id, first_name) VALUES ($1, $2)';
    await dbClient.query(query, [chatId, username]);
  } catch (err) {
    console.error('Error registering user:', err);
    throw err;
  } finally {
    await dbClient.end();
  }
}

module.exports = {
  isUserAuthorized,
  registerUser,
};
