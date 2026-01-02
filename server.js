const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const app = express();

const helmet = require('helmet');
const cors = require('cors');

// Установите пакеты
// npm install helmet cors

// Настройка безопасности
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://unpkg.com", "https://challenges.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

// Настройка CORS для внешнего доступа
app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем все в разработке, в продакшене укажите домены
        if (!origin || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        // Список разрешенных доменов
        const allowedOrigins = [
            'https://jugaricit.com',
            'https://ваш-домен.ngrok-free.app',
            // добавьте другие домены
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Получаем порт из переменных окружения или используем 3000
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Слушаем все интерфейсы

// Запуск сервера
app.listen(PORT, HOST, () => {
    console.log('='.repeat(60));
    console.log(`🚀 Сервер запущен`);
    console.log(`   Локально: http://localhost:${PORT}`);
    console.log(`   В сети:   http://${require('os').hostname()}:${PORT}`);
    
    // Показываем все IP адреса
    const networkInterfaces = require('os').networkInterfaces();
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((interface) => {
            if (interface.family === 'IPv4' && !interface.internal) {
                console.log(`            http://${interface.address}:${PORT}`);
            }
        });
    });
    
    console.log('='.repeat(60));
});
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Session-ID');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Упрощенная проверка авторизации через сессии
const sessions = {};

function authenticate(req, res, next) {
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId || !sessions[sessionId]) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    req.user = sessions[sessionId];
    next();
}

// Улучшенная функция для загрузки JSON с обработкой ошибок
async function loadJSON(file) {
    try {
        // Проверяем существование файла
        try {
            await fs.access(file);
        } catch {
            // Файл не существует, создаем базовую структуру
            const defaultData = file.includes('auth') ? { users: [] } : [];
            await fs.writeFile(file, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        
        // Читаем файл
        const data = await fs.readFile(file, 'utf8');
        
        // Проверяем, не пустой ли файл
        if (!data || data.trim() === '') {
            const defaultData = file.includes('auth') ? { users: [] } : [];
            await fs.writeFile(file, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        
        // Пытаемся распарсить JSON
        try {
            return JSON.parse(data);
        } catch (parseError) {
            console.error(`❌ Ошибка парсинга JSON в файле ${file}:`, parseError);
            console.error(`📄 Содержимое файла:`, data.substring(0, 200));
            
            // Создаем новый корректный файл
            const defaultData = file.includes('auth') ? { users: [] } : [];
            await fs.writeFile(file, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        
    } catch (error) {
        console.error(`❌ Критическая ошибка при загрузке ${file}:`, error);
        // Возвращаем данные по умолчанию
        return file.includes('auth') ? { users: [] } : [];
    }
}

async function saveJSON(file, data) {
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`❌ Ошибка сохранения в ${file}:`, error);
    }
}

// Создание администратора при запуске
async function createAdminUser() {
    try {
        const authFile = path.join(__dirname, 'auth.json');
        let authData = await loadJSON(authFile);
        
        // Проверяем структуру данных
        if (!authData.users) {
            authData = { users: [] };
        }
        
        // Если пользователей нет, создаем администратора
        if (authData.users.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const adminUser = {
                id: 1,
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                name: 'Администратор',
                email: 'admin@jugaricit.com',
                created_at: new Date().toISOString()
            };
            
            authData.users.push(adminUser);
            await saveJSON(authFile, authData);
            
            console.log('✅ Создан пользователь по умолчанию');
            console.log('🔑 Логин: admin');
            console.log('🔒 Пароль: admin123');
            console.log('⚠️  СМЕНИТЕ ПАРОЛЬ ПРИ ПЕРВОМ ВХОДЕ!');
        } else {
            console.log('👤 Найдены существующие пользователи:', authData.users.length);
        }
    } catch (error) {
        console.error('❌ Ошибка создания администратора:', error);
    }
}

// API для входа
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Попытка входа:', req.body.username);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Введите логин и пароль' 
            });
        }
        
        // Загружаем пользователей
        const authFile = path.join(__dirname, 'auth.json');
        let authData = await loadJSON(authFile);
        
        console.log('👥 Пользователей в базе:', authData?.users?.length || 0);
        
        // Проверяем структуру данных
        if (!authData.users) {
            authData.users = [];
        }
        
        // Ищем пользователя
        const user = authData.users.find(u => u.username === username);
        
        if (!user) {
            console.log('❌ Пользователь не найден:', username);
            return res.status(401).json({ 
                success: false, 
                message: 'Неверное имя пользователя или пароль' 
            });
        }
        
        console.log('✅ Пользователь найден:', user.username);
        
        // Проверяем пароль
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            console.log('❌ Неверный пароль для пользователя:', username);
            return res.status(401).json({ 
                success: false, 
                message: 'Неверное имя пользователя или пароль' 
            });
        }
        
        console.log('✅ Пароль верный');
        
        // Создаем сессию
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessions[sessionId] = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email
        };
        
        // Устанавливаем время жизни сессии (24 часа)
        setTimeout(() => {
            delete sessions[sessionId];
        }, 24 * 60 * 60 * 1000);
        
        console.log('✅ Сессия создана:', sessionId);
        
        res.json({
            success: true,
            message: 'Авторизация успешна',
            sessionId: sessionId,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера при авторизации' 
        });
    }
});

// API для проверки сессии
app.post('/api/auth/verify', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    
    console.log('🔍 Проверка сессии:', sessionId?.substring(0, 20) + '...');
    
    if (!sessionId || !sessions[sessionId]) {
        return res.status(401).json({ success: false, message: 'Сессия недействительна' });
    }
    
    res.json({
        success: true,
        user: sessions[sessionId]
    });
});

// API для выхода
app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }
    
    res.json({
        success: true,
        message: 'Выход выполнен'
    });
});

// API для получения заявок (без авторизации для теста)
app.get('/api/submissions', async (req, res) => {
    console.log('📋 Запрос заявок');
    
    try {
        const submissionsFile = path.join(__dirname, 'submissions.json');
        const submissions = await loadJSON(submissionsFile);
        
        // Проверяем, что submissions - это массив
        const submissionsArray = Array.isArray(submissions) ? submissions : [];
        
        // Сортируем по дате (новые сверху)
        submissionsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('✅ Заявок найдено:', submissionsArray.length);
        
        res.json({
            success: true,
            data: submissionsArray,
            count: submissionsArray.length
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения заявок:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка получения заявок' 
        });
    }
});

// Обновление статуса заявки
app.put('/api/submissions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['new', 'viewed', 'contacted', 'completed', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Неверный статус' 
            });
        }
        
        const submissionsFile = path.join(__dirname, 'submissions.json');
        const submissions = await loadJSON(submissionsFile);
        const submissionsArray = Array.isArray(submissions) ? submissions : [];
        
        const submissionIndex = submissionsArray.findIndex(s => s.id === id);
        
        if (submissionIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Заявка не найдена' 
            });
        }
        
        // Обновляем статус
        submissionsArray[submissionIndex].status = status;
        submissionsArray[submissionIndex].updated_at = new Date().toISOString();
        submissionsArray[submissionIndex].updated_by = 'admin';
        
        await saveJSON(submissionsFile, submissionsArray);
        
        res.json({
            success: true,
            message: 'Статус обновлен',
            data: submissionsArray[submissionIndex]
        });
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Удаление заявки
app.delete('/api/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const submissionsFile = path.join(__dirname, 'submissions.json');
        const submissions = await loadJSON(submissionsFile);
        const submissionsArray = Array.isArray(submissions) ? submissions : [];
        
        const filteredSubmissions = submissionsArray.filter(s => s.id !== id);
        
        if (filteredSubmissions.length === submissionsArray.length) {
            return res.status(404).json({ 
                success: false, 
                message: 'Заявка не найдена' 
            });
        }
        
        await saveJSON(submissionsFile, filteredSubmissions);
        
        res.json({
            success: true,
            message: 'Заявка удалена',
            count: filteredSubmissions.length
        });
        
    } catch (error) {
        console.error('Ошибка удаления заявки:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// API для отправки заявок
app.post('/api/submit', async (req, res) => {
    console.log('📝 Получена новая заявка');
    
    try {
        let name, surname, email, phone;
        
        // Проверяем разные форматы данных
        if (req.body.form) {
            name = req.body.form.name;
            surname = req.body.form.surname;
            email = req.body.form.email;
            phone = req.body.form.phone;
        } else {
            name = req.body.name;
            surname = req.body.surname;
            email = req.body.email;
            phone = req.body.phone;
        }
        
        // Простая валидация
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Имя и email обязательны' 
            });
        }
        
        // Создаем объект заявки
        const submission = {
            id: Date.now().toString(),
            name: name.trim(),
            surname: surname ? surname.trim() : '',
            email: email.trim(),
            phone: phone ? phone.trim() : '',
            date: new Date().toISOString(),
            status: 'new',
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
        };
        
        // Сохраняем в JSON файл
        const submissionsFile = path.join(__dirname, 'submissions.json');
        let submissions = await loadJSON(submissionsFile);
        const submissionsArray = Array.isArray(submissions) ? submissions : [];
        
        submissionsArray.push(submission);
        await saveJSON(submissionsFile, submissionsArray);
        
        console.log(`✅ Новая заявка: ${submission.name} (${submission.email})`);
        
        res.json({
            success: true,
            message: 'Заявка успешно отправлена!',
            data: {
                id: submission.id,
                name: submission.name,
                email: submission.email
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка при сохранении заявки:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при обработке заявки' 
        });
    }
});

// Создание тестовых заявок
app.get('/api/create-test-data', async (req, res) => {
    try {
        const submissionsFile = path.join(__dirname, 'submissions.json');
        let submissions = await loadJSON(submissionsFile);
        let submissionsArray = Array.isArray(submissions) ? submissions : [];
        
        // Добавляем тестовые заявки
        const testSubmissions = [
            {
                id: 'test_' + Date.now() + '_1',
                name: 'Иван Петров',
                email: 'ivan@example.com',
                phone: '+7 999 123 45 67',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'new',
                ip: '127.0.0.1'
            },
            {
                id: 'test_' + Date.now() + '_2',
                name: 'Мария Сидорова',
                email: 'maria@example.com',
                phone: '+7 999 765 43 21',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'contacted',
                ip: '127.0.0.1'
            },
            {
                id: 'test_' + Date.now() + '_3',
                name: 'Алексей Иванов',
                email: 'alex@example.com',
                date: new Date().toISOString(),
                status: 'completed',
                ip: '127.0.0.1'
            }
        ];
        
        submissionsArray.push(...testSubmissions);
        await saveJSON(submissionsFile, submissionsArray);
        
        console.log('✅ Создано тестовых заявок:', testSubmissions.length);
        
        res.json({
            success: true,
            message: 'Тестовые заявки созданы',
            count: submissionsArray.length
        });
        
    } catch (error) {
        console.error('Ошибка создания тестовых заявок:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// В server.js добавьте проверку ролей
function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role === 'admin') {
            return next(); // Админу все можно
        }
        
        if (role === 'manager' && (req.user.role === 'manager' || req.user.role === 'admin')) {
            return next();
        }
        
        if (role === 'viewer' && req.user.role) {
            return next(); // Любой авторизованный пользователь
        }
        
        return res.status(403).json({ error: 'Недостаточно прав' });
    };
}

// Пример использования
app.get('/api/admin-only', authenticate, requireRole('admin'), (req, res) => {
    // Только для админов
});

app.get('/api/manage-submissions', authenticate, requireRole('manager'), (req, res) => {
    // Для админов и менеджеров
});

// Статические маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

app.get('/homepage', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

app.get('/approaches', (req, res) => {
    res.sendFile(path.join(__dirname, 'approaches.html'));
});

app.get('/cases', (req, res) => {
    res.sendFile(path.join(__dirname, 'cases.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Запуск сервера
app.listen(PORT, async () => {
    console.log('='.repeat(60));
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log('='.repeat(60));
    
    console.log('\n📁 Доступные страницы:');
    console.log(`  📌 Главная: http://localhost:${PORT}`);
    console.log(`  📞 Контакты: http://localhost:${PORT}/contact`);
    console.log(`  🔐 Вход: http://localhost:${PORT}/login`);
    console.log(`  📊 Админка: http://localhost:${PORT}/admin`);
    
    console.log('\n🛠️  Полезные эндпоинты:');
    console.log(`  📝 Тестовые данные: http://localhost:${PORT}/api/create-test-data`);
    
    console.log('\n' + '='.repeat(60));
    
    try {
        // Инициализация
        await createAdminUser();
        
        // Проверяем файлы
        console.log('\n📂 Проверка файлов:');
        
        const authFile = path.join(__dirname, 'auth.json');
        const submissionsFile = path.join(__dirname, 'submissions.json');
        
        try {
            await fs.access(authFile);
            console.log('✅ auth.json существует');
        } catch {
            console.log('❌ auth.json не существует, создаю...');
            await fs.writeFile(authFile, JSON.stringify({ users: [] }, null, 2));
        }
        
        try {
            await fs.access(submissionsFile);
            console.log('✅ submissions.json существует');
        } catch {
            console.log('❌ submissions.json не существует, создаю...');
            await fs.writeFile(submissionsFile, JSON.stringify([], null, 2));
        }
        
        // Загружаем данные для проверки
        const authData = await loadJSON(authFile);
        const submissions = await loadJSON(submissionsFile);
        
        console.log(`👥 Пользователей: ${authData?.users?.length || 0}`);
        console.log(`📋 Заявок: ${Array.isArray(submissions) ? submissions.length : 0}`);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔑 ДЛЯ ВХОДА ИСПОЛЬЗУЙТЕ:');
    console.log('   Логин: admin');
    console.log('   Пароль: admin123');
    console.log('='.repeat(60));
});