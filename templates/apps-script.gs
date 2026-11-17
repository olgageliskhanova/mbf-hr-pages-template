/**
 * MBF · HR — приём ответов со страницы в Google-таблицу.
 *
 * Ставится в таблицу: Расширения → Apps Script → вставить этот код → Сохранить →
 * Начать развертывание → Новое развертывание → Веб-приложение
 * (Запуск от имени: Я · У кого есть доступ: Все).
 *
 * Ответы пишутся на лист «Ответы». Листа нет — скрипт создаст его сам.
 * Лист пустой — строку 1 (тексты вопросов) скрипт запишет сам при первом ответе.
 * Заголовки уже есть — число колонок обязано совпасть, иначе ответ не пишется
 * (ошибка header mismatch), чтобы ответы не съехали в чужие колонки.
 */

const SHEET_NAME = 'Ответы';
const ANONYMOUS = false;   // true — анонимная анкета: пишем только дату, без времени

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const data = JSON.parse(e.postData.contents);
    const values = Array.isArray(data.values) ? data.values : [];
    if (values.length === 0 || values.length > 200) return reply({ ok: false, error: 'wrong answers count' });

    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);

    const tz = 'Europe/Moscow';
    const stamp = Utilities.formatDate(new Date(), tz, ANONYMOUS ? 'dd.MM.yyyy' : 'dd.MM.yyyy HH:mm');

    // Защита от формул: текст, который начинается с = + - @, пишем как текст
    const safe = list => list.map(v => {
      if (typeof v === 'number') return v;
      const s = String(v == null ? '' : v).slice(0, 5000);
      return /^[=+\-@]/.test(s) ? "'" + s : s;
    });

    const width = values.length + 1;
    if (sheet.getLastRow() === 0) {
      const headers = Array.isArray(data.headers) && data.headers.length === values.length
        ? data.headers
        : values.map((_, i) => 'Вопрос ' + (i + 1));
      sheet.appendRow([ANONYMOUS ? 'Дата' : 'Дата и время'].concat(safe(headers)));
      sheet.setFrozenRows(1);
    } else if (sheet.getLastColumn() !== width) {
      return reply({ ok: false, error: 'header mismatch: в таблице ' + sheet.getLastColumn() + ' колонок, анкете нужно ' + width });
    }

    sheet.appendRow([stamp].concat(safe(values)));
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Проверка, что веб-приложение живо: открыть адрес /exec в браузере
function doGet() {
  return reply({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
