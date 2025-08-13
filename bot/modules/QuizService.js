const XLSX = require('xlsx');
const path = require('path');

const excelFilePath = path.join(__dirname, '../../data.xlsx');
let excelQuestions = [];

function loadQuestionsFromExcel() {
  try {
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    excelQuestions = XLSX.utils.sheet_to_json(sheet);

    if (excelQuestions.length === 0) {
      console.error('В Excel нет вопросов.');
    }
  } catch (err) {
    console.error('Ошибка при чтении Excel:', err);
    excelQuestions = [];
  }
}

loadQuestionsFromExcel();

const userCurrentQuestion = new Map();
const userStats = new Map();

async function getRandomQuestion() {
  if (excelQuestions.length === 0) {
    return null;
  }
  const idx = Math.floor(Math.random() * excelQuestions.length);
  const row = excelQuestions[idx];

  if (!row.question_text || !row.correct_answer) {
    console.error('Ошибка: пустой вопрос или правильный ответ в Excel.');
    return null;
  }

  return {
    question: String(row.question_text).trim(),
    correctAnswer: String(row.correct_answer).trim(),
    wrongAnswer1: row.wrong_answer_1 ? String(row.wrong_answer_1).trim() : '—',
    wrongAnswer2: row.wrong_answer_2 ? String(row.wrong_answer_2).trim() : '—',
  };
}

async function startQuiz(bot, chatId) {
  const q = await getRandomQuestion();
  if (!q) {
    await bot.sendMessage(chatId, 'Нет доступных вопросов.');
    return;
  }

  userCurrentQuestion.set(chatId, q);

  const answers = [q.correctAnswer, q.wrongAnswer1, q.wrongAnswer2]
    .filter(a => a && a.trim())
    .sort(() => Math.random() - 0.5);

  await bot.sendMessage(chatId, q.question, {
    reply_markup: {
      keyboard: answers.map(a => [{ text: a }]),
      resize_keyboard: true,
    },
  });
}

function getCorrectAnswer(chatId) {
  const q = userCurrentQuestion.get(chatId);
  return q ? q.correctAnswer : null;
}

function updateScore(chatId, isCorrect) {
  if (!userStats.has(chatId)) {
    userStats.set(chatId, { correct: 0, wrong: 0, totalQuestions: 0, timeSpent: 0 });
  }
  const stats = userStats.get(chatId);
  if (isCorrect) stats.correct++;
  else stats.wrong++;
  stats.totalQuestions++;
}

function getAllTimeScore(chatId) {
  return userStats.get(chatId) || { correct: 0, wrong: 0, totalQuestions: 0, timeSpent: 0 };
}

function stopQuiz(chatId) {
  userCurrentQuestion.delete(chatId);
}

module.exports = { startQuiz, getCorrectAnswer, updateScore, getAllTimeScore, stopQuiz };
