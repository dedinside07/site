const express = require('express');
const fs = require('fs').promises;
const path = require('path');

/* =========================================================
   КОНСТАНТЫ И НАСТРОЙКИ
========================================================= */
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

const app = express();

/* =========================================================
   MIDDLEWARE
========================================================= */
app.use(express.json());
app.use(express.static('public'));

/* =========================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
========================================================= */
async function loadJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return null;
    }
}

async function saveJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error(`Ошибка сохранения ${filePath}:`, err);
        return false;
    }
}

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ ДАННЫХ
========================================================= */
async function init() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });

        try {
            await fs.access(AUTH_FILE);
        } catch {
            await saveJSON(AUTH_FILE, {
                users: [
                    { username: 'admin', role: 'admin' },
                    { username: 'manager', role: 'manager' },
                    { username: 'viewer', role: 'viewer' }
                ]
            });
        }

        try {
            await fs.access(SUBMISSIONS_FILE);
        } catch {
            await saveJSON(SUBMISSIONS_FILE, []);
        }
    } catch (err) {
        console.error('Ошибка инициализации:', err);
    }
}

/* =========================================================
   МАРШРУТЫ API
========================================================= */
app.get('/api/users', async (req, res) => {
    try {
        const authData = await loadJSON(AUTH_FILE);
        res.json(authData?.users || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки пользователей' });
    }
});

app.get('/api/submissions', async (req, res) => {
    try {
        const submissions = await loadJSON(SUBMISSIONS_FILE);
        res.json(submissions || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки заявок' });
    }
});

// Добавьте другие маршруты по необходимости

/* =========================================================
   ЗАПУСК СЕРВЕРА
========================================================= */
app.listen(PORT, async () => {
    console.log('============================================================');
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log('============================================================');

    await init();

    const authData = await loadJSON(AUTH_FILE);
    const submissions = await loadJSON(SUBMISSIONS_FILE);

    console.log(`👥 Пользователей: ${authData?.users?.length || 0}`);
    console.log(`📋 Заявок: ${Array.isArray(submissions) ? submissions.length : 0}`);

    console.log('============================================================');
    console.log('🔑 ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ:');
    console.log('   admin / manager / viewer');
    console.log('============================================================');
});

module.exports = app;