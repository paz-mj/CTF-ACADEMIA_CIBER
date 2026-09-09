const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.CTF_SECRET || 'academia-lab-local-2026';

const FLAGS = {
  1: 'ACADEMIA{el_codigo_fuente_no_miente}',
  2: 'ACADEMIA{las_rutas_tambien_hablan}',
  3: 'ACADEMIA{el_codigo_tambien_es_pista}',
  4: 'ACADEMIA{las_cookies_guardan_secretos}',
  5: 'ACADEMIA{la_respuesta_viaja_escondida}'
};

// Tabla de posiciones en memoria: playerId -> { username, startTime, finishTime }
// Se reinicia si el servidor se reinicia. Suficiente para una sesion de clase en vivo.
const players = new Map();

app.use(express.urlencoded({ extended: false }));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

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
  res.append('Set-Cookie', `ctf_progress=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`);
}

function getPlayerId(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies.ctf_player || null;
}

function getPlayer(req) {
  const playerId = getPlayerId(req);
  if (!playerId || !players.has(playerId)) return null;
  return { id: playerId, ...players.get(playerId) };
}

function requireRegistration(req, res, next) {
  if (getPlayer(req)) return next();
  return res.redirect('/');
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
app.use('/nivel1', requireRegistration, express.static(path.join(__dirname, 'niveles', 'nivel1')));
app.use('/nivel2', requireRegistration, requireLevel(2), express.static(path.join(__dirname, 'niveles', 'nivel2')));
app.use('/nivel3', requireRegistration, requireLevel(3), express.static(path.join(__dirname, 'niveles', 'nivel3')));

app.get('/nivel4/', requireRegistration, requireLevel(4), (req, res) => {
  const pista = Buffer.from(FLAGS[4]).toString('base64');
  res.append('Set-Cookie', `pista_nivel4=${encodeURIComponent(pista)}; Path=/nivel4; SameSite=Lax`);
  res.sendFile(path.join(__dirname, 'niveles', 'nivel4', 'index.html'));
});

app.get('/nivel5/', requireRegistration, requireLevel(5), (req, res) => {
  res.setHeader('X-Academia-Flag', FLAGS[5]);
  res.sendFile(path.join(__dirname, 'niveles', 'nivel5', 'index.html'));
});

function renderRegistrationBox() {
  return `
    <div class="box">
      <h2>Ingresa tu nombre para comenzar</h2>
      <p>Este nombre va a aparecer en la tabla de posiciones cuando termines el CTF. El cronometro empieza a correr apenas te registras.</p>
      <form class="unlock" method="POST" action="/registrar">
        <label for="username">Nombre o apodo</label>
        <input id="username" name="username" autocomplete="off" maxlength="40" required>
        <button type="submit">Comenzar</button>
      </form>
    </div>`;
}

function renderProgressBox(player, unlocked) {
  const status = player.finishTime
    ? `<p>Ya completaste el CTF. Revisa tu puesto en la <a href="/ranking">tabla de posiciones</a>.</p>`
    : `<p>Tu progreso actual: nivel ${unlocked} de 5.</p><p>Continua en: <a href="/nivel${unlocked}/">/nivel${unlocked}/</a></p>`;

  return `
    <div class="box">
      <p>Hola, <strong>${escapeHtml(player.username)}</strong>.</p>
      ${status}
    </div>

    <div class="box">
      <h2>Tabla de posiciones</h2>
      <p><a href="/ranking">Ver quien ha terminado y en cuanto tiempo</a></p>
    </div>

    <div class="box">
      <h2>Control de progreso</h2>
      <p>Si quieres reiniciar por completo (nombre, progreso y tiempo incluidos):</p>
      <form method="POST" action="/reiniciar" class="actions">
        <button class="btn" type="submit">Reiniciar progreso</button>
      </form>
    </div>`;
}

app.get('/', (req, res) => {
  const player = getPlayer(req);
  const template = fs.readFileSync(path.join(__dirname, 'views', 'home.html'), 'utf8');
  const content = player ? renderProgressBox(player, getUnlockedLevel(req)) : renderRegistrationBox();
  res.send(template.replace('<!--CONTENT-->', content));
});

app.post('/registrar', (req, res) => {
  if (getPlayer(req)) {
    return res.redirect('/');
  }

  const username = String(req.body.username || '').trim().slice(0, 40);
  if (!username) {
    return res.redirect('/');
  }

  const playerId = crypto.randomUUID();
  players.set(playerId, { username, startTime: Date.now(), finishTime: null });

  res.append('Set-Cookie', `ctf_player=${encodeURIComponent(playerId)}; Path=/; HttpOnly; SameSite=Lax`);
  setUnlockedLevel(res, 1);
  res.redirect('/nivel1/');
});

app.get('/ranking', (req, res) => {
  const currentPlayerId = getPlayerId(req);
  const finished = [...players.entries()]
    .filter(([, player]) => player.finishTime)
    .map(([id, player]) => ({
      id,
      username: player.username,
      elapsedMs: player.finishTime - player.startTime
    }))
    .sort((a, b) => a.elapsedMs - b.elapsedMs);

  const rows = finished.map((player, index) => `
        <tr class="${player.id === currentPlayerId ? 'me' : ''}">
          <td>${index + 1}</td>
          <td>${escapeHtml(player.username)}</td>
          <td>${formatDuration(player.elapsedMs)}</td>
        </tr>`).join('');

  const tableOrEmpty = finished.length
    ? `<table class="ranking">
        <thead>
          <tr><th>#</th><th>Nombre</th><th>Tiempo</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
    : '<p>Aun nadie ha completado el CTF.</p>';

  const felicitaciones = req.query.final === '1'
    ? '<div class="box"><p class="flag">Completaste el CTF. Revisa tu puesto abajo.</p></div>'
    : '';

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tabla de posiciones - Academia de Ciberseguridad UCN</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <main class="container">
    <h1>Tabla de posiciones</h1>
    ${felicitaciones}
    <div class="box">
      ${tableOrEmpty}
    </div>
    <p><a href="/">Volver al inicio</a></p>
  </main>
</body>
</html>`);
});

app.post('/validar', (req, res) => {
  const player = getPlayer(req);
  if (!player) {
    return res.redirect('/');
  }

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
    const storedPlayer = players.get(player.id);
    if (storedPlayer && !storedPlayer.finishTime) {
      storedPlayer.finishTime = Date.now();
    }
    return res.redirect('/ranking?final=1');
  }

  return res.redirect(`/nivel${nivel + 1}/`);
});

app.post('/reiniciar', (req, res) => {
  const playerId = getPlayerId(req);
  if (playerId) {
    players.delete(playerId);
  }

  setUnlockedLevel(res, 1);
  res.append('Set-Cookie', 'ctf_player=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`CTF levantado en http://localhost:${PORT}`);
});
