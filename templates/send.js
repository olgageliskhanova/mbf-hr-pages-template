// Образец отправки ответов со страницы site/<имя>/index.html (вставляется в <script> страницы).
// FORM — имя папки страницы, ровно как ключ в site/api/submit.js.
// headers — тексты вопросов по порядку, values — ответы в том же порядке.
// Страница шлёт только на свой /api/submit; адреса таблиц в странице не пишем.

const FORM = 'имя-папки-страницы';

let ready = null;
fetch('/api/submit?form=' + encodeURIComponent(FORM))
  .then(r => r.json()).then(d => { ready = d.ready === true; }).catch(() => {});
// ready === false → показать плашку «Анкета в режиме проверки: таблица ещё не подключена»

async function sendAnswers(headers, values) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    const r = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form: FORM, headers, values }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok === true) return '';            // '' = успех → экран «Спасибо»
    return d.error || ('HTTP ' + r.status);         // текст ошибки → показать мелко под кнопкой
  } catch (e) {
    return e.name === 'AbortError' ? 'нет ответа от сервера' : 'нет связи';
  }
}
// При ошибке: «Не получилось отправить ответы. Они не потерялись: нажми «Отправить ещё раз».»
// Ответы до отправки держать в sessionStorage, чтобы не пропали при перезагрузке.
