const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createCorrectUsers() {
    console.log('👥 ПРАВИЛЬНОЕ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ');
    console.log('='.repeat(60));
    
    try {
        // Читаем или создаем auth.json
        let authData;
        try {
            const data = await fs.readFile('auth.json', 'utf8');
            authData = JSON.parse(data);
            console.log('✅ Файл auth.json загружен');
        } catch {
            authData = { users: [] };
            console.log('📝 Создан новый файл auth.json');
        }
        
        if (!authData.users) {
            authData.users = [];
        }
        
        console.log(`👤 Текущих пользователей: ${authData.users.length}`);
        
        // Показываем текущих пользователей
        if (authData.users.length > 0) {
            console.log('\n📋 Текущие пользователи:');
            authData.users.forEach((user, i) => {
                console.log(`  ${i+1}. ${user.username} - ${user.name} (${user.role})`);
            });
        }
        
        rl.question('\n📝 Введите логин нового пользователя: ', async (username) => {
            if (!username) {
                console.log('❌ Логин не может быть пустым');
                rl.close();
                return;
            }
            
            // Проверяем, нет ли уже такого пользователя
            if (authData.users.some(u => u.username === username)) {
                console.log(`❌ Пользователь "${username}" уже существует`);
                rl.close();
                return;
            }
            
            rl.question('📝 Введите имя пользователя: ', async (name) => {
                rl.question('📝 Введите email (опционально): ', async (email) => {
                    rl.question('👑 Введите роль (admin/manager/viewer): ', async (role) => {
                        rl.question('🔑 Введите пароль: ', async (password) => {
                            try {
                                console.log('\n🔄 Создаю пользователя...');
                                
                                // Проверяем пароль
                                if (!password || password.length < 6) {
                                    console.log('❌ Пароль должен быть не менее 6 символов');
                                    rl.close();
                                    return;
                                }
                                
                                // Генерируем хеш правильно
                                console.log('🔐 Генерирую хеш пароля...');
                                const saltRounds = 10;
                                const hashedPassword = await bcrypt.hash(password, saltRounds);
                                
                                // Проверяем, что хеш работает
                                console.log('✅ Хеш сгенерирован');
                                console.log('🔍 Проверяю хеш...');
                                const isValid = await bcrypt.compare(password, hashedPassword);
                                
                                if (!isValid) {
                                    console.log('❌ Ошибка: хеш не прошел проверку');
                                    rl.close();
                                    return;
                                }
                                
                                console.log('✅ Хеш прошел проверку');
                                
                                // Создаем пользователя
                                const newUser = {
                                    id: Date.now(),
                                    username: username,
                                    password: hashedPassword,
                                    name: name,
                                    email: email || '',
                                    role: role || 'viewer',
                                    created_at: new Date().toISOString()
                                };
                                
                                // Добавляем в массив
                                authData.users.push(newUser);
                                
                                // Сохраняем
                                await fs.writeFile('auth.json', JSON.stringify(authData, null, 2));
                                await fs.writeFile('auth_backup.json', JSON.stringify(authData, null, 2));
                                
                                console.log('\n' + '='.repeat(60));
                                console.log('✅ ПОЛЬЗОВАТЕЛЬ УСПЕШНО СОЗДАН!');
                                console.log('='.repeat(60));
                                
                                console.log('\n📋 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:');
                                console.log('┌' + '─'.repeat(58) + '┐');
                                console.log(`│ 👤 Логин:        ${newUser.username}`);
                                console.log(`│ 📛 Имя:          ${newUser.name}`);
                                console.log(`│ 👑 Роль:          ${newUser.role}`);
                                console.log(`│ 📧 Email:         ${newUser.email || 'не указан'}`);
                                console.log(`│ 🔑 Пароль:        ${password}`);
                                console.log(`│ 🔐 Хеш пароля:    ${hashedPassword.substring(0, 30)}...`);
                                console.log(`│ 📅 Создан:        ${new Date().toLocaleString()}`);
                                console.log('└' + '─'.repeat(58) + '┘');
                                
                                // Создаем команду для тестирования
                                console.log('\n🔄 ДЛЯ ТЕСТИРОВАНИЯ:');
                                console.log(`curl -X POST http://localhost:3000/api/auth/login \\`);
                                console.log(`     -H "Content-Type: application/json" \\`);
                                console.log(`     -d '{"username":"${username}","password":"${password}"}'`);
                                
                                // Сохраняем в отдельный файл для истории
                                const userInfo = {
                                    username: username,
                                    password: password,
                                    hashed_password: hashedPassword,
                                    created: new Date().toISOString()
                                };
                                
                                let userHistory = [];
                                try {
                                    const historyData = await fs.readFile('users_history.json', 'utf8');
                                    userHistory = JSON.parse(historyData);
                                } catch {}
                                
                                userHistory.push(userInfo);
                                await fs.writeFile('users_history.json', JSON.stringify(userHistory, null, 2));
                                
                                console.log('\n💾 Информация сохранена в users_history.json');
                                
                            } catch (error) {
                                console.error('❌ Ошибка создания пользователя:', error);
                            } finally {
                                rl.close();
                            }
                        });
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        rl.close();
    }
}

createCorrectUsers();