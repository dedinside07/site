const bcrypt = require('bcrypt');
const fs = require('fs').promises;

async function changePassword() {
    try {
        // Читаем текущие данные
        const authData = JSON.parse(await fs.readFile('auth.json', 'utf8'));
        
        // Находим пользователя admin
        const adminUser = authData.users.find(u => u.username === 'admin');
        
        if (!adminUser) {
            console.log('❌ Пользователь admin не найден');
            return;
        }
        
        // Запрашиваем новый пароль
        const newPassword = '1@#462346#@$Seo_Ju/gar_iC@(!1cs12W41@%@'; // ← Введите ваш новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Обновляем пароль
        adminUser.password = hashedPassword;
        adminUser.updated_at = new Date().toISOString();
        
        // Сохраняем
        await fs.writeFile('auth.json', JSON.stringify(authData, null, 2));
        
        console.log('✅ Пароль успешно изменен!');
        console.log(`🔑 Новый пароль: ${newPassword}`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

changePassword();