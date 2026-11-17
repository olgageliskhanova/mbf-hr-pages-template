// ⬇⬇⬇ Адреса таблиц: имя папки страницы → адрес веб-приложения Apps Script (оканчивается на /exec).
// Новая страница site/<имя>/ — новая строка здесь. Пока адреса нет, пишем 'ВСТАВИТЬ_АДРЕС'.
const SHEETS = {
  // 'attestation-dec': 'https://script.google.com/macros/s/…/exec',
};
// ⬆⬆⬆ больше в этом файле ничего менять не нужно

const isReady = url => typeof url === 'string' && url.startsWith('https://script.google.com/');

export default async function handler(req, res) {
  // GET /api/submit?form=<имя> — страница спрашивает, подключена ли её таблица.
  // Сами адреса и список страниц наружу не отдаём.
  if (req.method === 'GET') {
    const form = String((req.query && req.query.form) || '');
    return res.status(200).json({ ok: true, ready: Object.hasOwn(SHEETS, form) && isReady(SHEETS[form]) });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  let p = req.body;
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = null; } }
  if (!p || typeof p.form !== 'string' || !Array.isArray(p.values) || p.values.length > 200)
    return res.status(400).json({ ok: false, error: 'bad request' });
  if (!Object.hasOwn(SHEETS, p.form) || !isReady(SHEETS[p.form]))
    return res.status(500).json({ ok: false, error: 'адрес таблицы не вставлен в api/submit.js' });
  const body = JSON.stringify({ form: p.form, values: p.values, headers: p.headers });
  if (body.length > 400000) return res.status(413).json({ ok: false, error: 'too large' });
  try {
    const r = await fetch(SHEETS[p.form], {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    });
    const text = await r.text();
    let d = null;
    try { d = JSON.parse(text); } catch {}
    const ok = r.ok && d !== null && d.ok === true;
    if (ok) return res.status(200).json({ ok: true });
    const error = (d && d.error) || `HTTP ${r.status}: ${text.replace(/\s+/g, ' ').slice(0, 120)}`;
    return res.status(502).json({ ok: false, error });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e).slice(0, 200) });
  }
}
