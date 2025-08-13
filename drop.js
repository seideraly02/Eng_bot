const { Client } = require('pg');
const xlsx = require('xlsx');

// Подключение к базе данных
const connectionString = 'postgres://postgres:sama1234@localhost:5432/postgres';
const dbClient = new Client({ connectionString });

(async () => {
  try {
    // Подключаемся к базе данных
    await dbClient.connect();
    console.log('Успешно подключено к базе данных.');

    // Чтение Excel-файла
    const workbook = xlsx.readFile('data.xlsx'); // Укажите путь к вашему файлу
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]).map((row) => ({
      question_text: row.question_text,
      correct_answer: row.correct_answer,
      wrong_answer_1: row.wrong_answer_1,
      wrong_answer_2: row.wrong_answer_2,
    }));

    console.log('Данные из Excel:', data);

    // Счётчик успешных вставок
    let rowsInserted = 0;

    // Загрузка данных в таблицу
    for (const row of data) {
      const { question_text, correct_answer, wrong_answer_1, wrong_answer_2 } = row;

      try {
        // Выполняем вставку данных (без id)
        await dbClient.query(
          'INSERT INTO questions (question_text, correct_answer, wrong_answer_1, wrong_answer_2) VALUES ($1, $2, $3, $4)',
          [question_text, correct_answer, wrong_answer_1, wrong_answer_2]
        );
        rowsInserted++; // Увеличиваем счётчик при успешной вставке
      } catch (err) {
        console.error('Ошибка при вставке строки:', err.message);
      }
    }

    console.log(`Данные успешно загружены в таблицу "questions". Количество загруженных строк: ${rowsInserted}`);
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err);
  } finally {
    // Закрываем соединение с базой данных
    await dbClient.end();
    console.log('Соединение с базой данных закрыто.');
  }
})();
