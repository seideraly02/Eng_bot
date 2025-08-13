const QuizService = require('./QuizService');

async function handleUpdateAsync(bot, update) {
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const messageText = update.message.text.trim().toLowerCase();

    switch (messageText) {
      case '/start':
        await bot.sendMessage(chatId, '🎯 Добро пожаловать в викторину!\nВыберите действие ниже:', getInlineMainMenu());
        break;

      case 'начать игру':
      case '/quiz':
        await QuizService.startQuiz(bot, chatId);
        break;

      case 'посмотреть статистику':
      case '/view_stats':
        const allTimeScore = QuizService.getAllTimeScore(chatId);
        await sendStats(bot, chatId, allTimeScore);
        break;

      case 'правила игры':
        await sendRules(bot, chatId);
        break;

      case 'stop':
        await stopGame(bot, chatId);
        break;

      default:
        const correctAnswer = QuizService.getCorrectAnswer(chatId);
        if (correctAnswer) {
          if (messageText === correctAnswer.toLowerCase()) {
            QuizService.updateScore(chatId, true);
            await bot.sendMessage(chatId, '✅ Правильно!');
          } else {
            QuizService.updateScore(chatId, false);
            await bot.sendMessage(chatId, `❌ Неправильно. Правильный ответ: ${correctAnswer}`);
          }
          await QuizService.startQuiz(bot, chatId);
        } else {
          await bot.sendMessage(chatId, '❓ Неизвестная команда. Используйте /start.');
        }
        break;
    }
  } else if (update.callback_query) {
    await handleCallbackQuery(bot, update.callback_query);
  }
}

function getInlineMainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Начать игру', callback_data: 'start_game' }],
        [{ text: '📊 Статистика', callback_data: 'view_stats' }],
        [{ text: '📜 Правила игры', callback_data: 'rules' }],
        [{ text: '⏹ Стоп', callback_data: 'stop_game' }]
      ],
    },
  };
}

async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;

  switch (callbackQuery.data) {
    case 'start_game':
      await QuizService.startQuiz(bot, chatId);
      break;

    case 'view_stats':
      const stats = QuizService.getAllTimeScore(chatId);
      await sendStats(bot, chatId, stats);
      break;

    case 'rules':
      await sendRules(bot, chatId);
      break;

    case 'stop_game':
      await stopGame(bot, chatId);
      break;
  }

  await bot.answerCallbackQuery(callbackQuery.id); // убираем "часики"
}

async function sendStats(bot, chatId, stats) {
  await bot.sendMessage(
    chatId,
    `📊 *Ваша статистика:*\n\n` +
    `✅ Правильных: *${stats.correct}*\n` +
    `❌ Неправильных: *${stats.wrong}*\n` +
    `📌 Всего вопросов: *${stats.totalQuestions}*\n` +
    `🕒 Время в игре: *${stats.timeSpent.toFixed(2)}* минут`,
    { parse_mode: 'Markdown' }
  );
}

async function sendRules(bot, chatId) {
  await bot.sendMessage(
    chatId,
    '📜 *Правила игры:*\n\n' +
    '1️⃣ Выберите один из предложенных вариантов ответа.\n' +
    '2️⃣ За правильный ответ получаете очки.\n' +
    '3️⃣ /start — начать заново.',
    { parse_mode: 'Markdown' }
  );
}

async function stopGame(bot, chatId) {
  QuizService.stopQuiz(chatId);
  const finalStats = QuizService.getAllTimeScore(chatId);
  await bot.sendMessage(chatId, '⏹ *Викторина завершена!*', { parse_mode: 'Markdown' });
  await sendStats(bot, chatId, finalStats);
}

async function handleErrorAsync(bot, error) {
  console.error('Ошибка:', error.message);
}

module.exports = { handleUpdateAsync, handleErrorAsync };
