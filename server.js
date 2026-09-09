const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const SECRET = process.env.CTF_SECRET || 'academia-lab-local-2026';

const FLAGS = {
  1: 'ACADEMIA{el_codigo_fuente_no_miente}',
  2: 'ACADEMIA{las_rutas_tambien_hablan}',
  3: 'ACADEMIA{el_codigo_tambien_es_pista}',
  4: 'ACADEMIA{las_cookies_guardan_secretos}',
  5: 'ACADEMIA{la_respuesta_viaja_escondida}'
};

app.use(express.urlencoded({ extended: false }));

function signProgress(level) {
  return crypto.createHmac('sha256', SECRET).update(String(level)).digest('hex').slice(0, 16);
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return acc;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function getUnlockedLevel(req) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies.ctf_progress;
  if (!raw) return 1;

  const [levelRaw, signature] = raw.split('.');
  const level = Number(levelRaw);
  if (!Number.isInteger(level) || level < 1 || level > 5) return 1;
  if (signature !== signProgress(level)) return 1;

  return level;
}

function setUnlockedLevel(res, level) {
  const safeLevel = Math.max(1, Math.min(5, Number(level) || 1));
  const value = `${safeLevel}.${signProgress(safeLevel)}`;
  res.setHeader('Set-Cookie', `ctf_progress=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`);
}

function requireLevel(level) {
  return (req, res, next) => {
    const unlocked = getUnlockedLevel(req);
    if (unlocked >= level) return next();

    return res.status(403).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acceso bloqueado</title>
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <h1>Acceso bloqueado</h1>
  <div class="box warning">
    <p>Ese nivel aun no esta desbloqueado.</p>
    <p>Debes completar primero los niveles anteriores y validar su flag.</p>
    <p>Tu progreso actual llega hasta: <strong>nivel ${unlocked}</strong>.</p>
    <p>Vuelve a: <a href="/nivel${unlocked}/">/nivel${unlocked}/</a></p>
  </div>
  <p><a href="/">Ir al inicio</a></p>
</body>
</html>`);
  };
}

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/nivel1', express.static(path.join(__dirname, 'niveles', 'nivel1')));
app.use('/nivel2', requireLevel(2), express.static(path.join(__dirname, 'niveles', 'nivel2')));
app.use('/nivel3', requireLevel(3), express.static(path.join(__dirname, 'niveles', 'nivel3')));

app.get('/nivel4/', requireLevel(4), (req, res) => {
  const pista = Buffer.from(FLAGS[4]).toString('base64');
  res.setHeader('Set-Cookie', `pista_nivel4=${encodeURIComponent(pista)}; Path=/nivel4; SameSite=Lax`);
  res.sendFile(path.join(__dirname, 'niveles', 'nivel4', 'index.html'));
});

app.get('/nivel5/', requireLevel(5), (req, res) => {
  res.setHeader('X-Academia-Flag', FLAGS[5]);
  res.sendFile(path.join(__dirname, 'niveles', 'nivel5', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.post('/validar', (req, res) => {
  const nivel = Number(req.body.nivel);
  const flag = String(req.body.flag || '').trim();
  const unlocked = getUnlockedLevel(req);

  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
    return res.redirect('/');
  }

  if (unlocked < nivel) {
    return res.redirect(`/nivel${unlocked}/`);
  }

  if (flag !== FLAGS[nivel]) {
    return res.redirect(`/nivel${nivel}/?error=1`);
  }

  const nextUnlocked = Math.max(unlocked, Math.min(5, nivel + 1));
  setUnlockedLevel(res, nextUnlocked);

  if (nivel === 5) {
    return res.redirect('/?final=1');
  }

  return res.redirect(`/nivel${nivel + 1}/`);
});

app.post('/reiniciar', (_req, res) => {
  setUnlockedLevel(res, 1);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`CTF levantado en http://localhost:${PORT}`);
});