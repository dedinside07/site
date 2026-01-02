const bcrypt = require('bcrypt');
const fs = require('fs').promises;

async function debugAuth() {
    console.log('🔐 ДЕБАГ АВТОРИЗАЦИИ');
    console.log('='.repeat(60));
    
    try {
        // Читаем auth.json
        const authData = JSON.parse(await fs.readFile('auth.json', 'utf8'));
        
        console.log(`👥 Всего пользователей: ${authData.users.length}`);
        console.log('\n' + '='.repeat(60));
        
        // Проверяем каждого пользователя
        for (const user of authData.users) {
            console.log(`\n🔍 Проверяю пользователя: ${user.username}`);
            console.log('─'.repeat(60));
            
            // Показываем информацию о хеше
            console.log(`📋 Имя: ${user.name}`);
            console.log(`👑 Роль: ${user.role}`);
            console.log(`📅 Создан: ${user.created_at}`);
            console.log(`🔐 Длина хеша: ${user.password.length} символов`);
            
            // Анализируем хеш
            const hashParts = user.password.split('$');
            console.log(`⚙️  Алгоритм: ${hashParts[1] || 'Неизвестно'}`);
            console.log(`💰 Стоимость: ${hashParts[2] || 'Неизвестно'}`);
            
            // Проверяем формат хеша
            if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$') || user.password.startsWith('$2y$')) {
                console.log('✅ Формат хеша: bcrypt');
                
                // Показываем первые 30 символов хеша
                console.log(`🔐 Хеш (первые 30 символов): ${user.password.substring(0, 30)}...`);
            } else {
                console.log('❌ НЕВЕРНЫЙ ФОРМАТ ХЕША!');
                console.log(`🔐 Хеш начинается с: ${user.password.substring(0, 10)}`);
            }
            
            // Пробуем разные пароли
            console.log('\n🧪 Тестирую возможные пароли:');
            
            const testPasswords = [
                'admin123',           // Стандартный пароль
                'password123',        // Частый пароль
                '123456',            // Простой пароль
                user.username,       // Пароль = логин
                user.username + '123', // Логин + 123
                'qwerty',            // Другой частый
                user.name.toLowerCase().replace(/\s+/g, '') + '123' // Имя + 123
            ];
            
            for (const testPass of testPasswords) {
                try {
                    const isValid = await bcrypt.compare(testPass, user.password);
                    if (isValid) {
                        console.log(`   ✅ НАЙДЕН ПАРОЛЬ! "${testPass}"`);
                        console.log(`   💾 Полный хеш: ${user.password}`);
                        break;
                    }
                } catch (error) {
                    console.log(`   ❌ Ошибка проверки пароля "${testPass}": ${error.message}`);
                }
            }
            
            console.log('─'.repeat(60));
        }
        
        // Проверка проблемы с кодировкой
        console.log('\n🔧 ПРОВЕРКА ПРОБЛЕМ С КОДИРОВКОЙ');
        console.log('='.repeat(60));
        
        // Проверяем, не поврежден ли JSON
        const jsonString = JSON.stringify(authData, null, 2);
        console.log(`📄 Длина JSON: ${jsonString.length} символов`);
        
        // Сохраняем копию для проверки
        await fs.writeFile('auth_debug.json', jsonString);
        console.log('✅ Сохранена копия: auth_debug.json');
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        
        // Проверяем, существует ли файл
        try {
            await fs.access('auth.json');
            console.log('✅ Файл auth.json существует');
            
            // Показываем содержимое файла
            const fileContent = await fs.readFile('auth.json', 'utf8');
            console.log(`📄 Размер файла: ${fileContent.length} байт`);
            console.log(`📄 Первые 200 символов:\n${fileContent.substring(0, 200)}`);
            
        } catch (fileError) {
            console.log('❌ Файл auth.json не существует!');
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ДЕБАГ ЗАВЕРШЕН');
}

debugAuth();