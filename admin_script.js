// admin_script.js - Упрощенная версия

class AdminPanel {
    constructor() {
        this.sessionId = null;
        this.user = null;
        this.submissions = [];
        this.filteredSubmissions = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentDateFilter = 'all';
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadData();
        this.updateDashboard();
        this.showAdminPanel();
    }
    
    async checkAuth() {
        try {
            // Получаем сессию из localStorage
            this.sessionId = localStorage.getItem('adminSessionId');
            
            if (!this.sessionId) {
                this.redirectToLogin();
                return;
            }
            
            // Проверяем сессию на сервере
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Invalid session');
            }
            
            this.user = data.user;
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Auth error:', error);
            this.redirectToLogin();
        }
    }
    
    redirectToLogin() {
        window.location.href = '/login';
    }
    
    updateUserInfo() {
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        
        if (userName) userName.textContent = this.user.name || this.user.username;
        if (userRole) userRole.textContent = this.user.role === 'admin' ? 'Администратор' : 'Пользователь';
    }
    
    setupEventListeners() {
        // Выход
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.logout());
        }
        
        // Навигация
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
        });
        
        // Кнопки на dashboard
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadData());
        }
        
        // Фильтры
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
            });
        }
        
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentDateFilter = e.target.value;
                this.applyFilters();
            });
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }
        
        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.submission-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });
        }
        
        // Export
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportToCSV());
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Модальное окно
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        // Сохранение статуса
        const saveStatusButton = document.getElementById('saveStatusButton');
        if (saveStatusButton) {
            saveStatusButton.addEventListener('click', () => this.saveSubmissionStatus());
        }
        
        // Удаление заявки
        const deleteButton = document.getElementById('deleteSubmissionButton');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => this.deleteSubmission());
        }
    }
    
    async loadData() {
        try {
            const response = await fetch('/api/submissions', {
                headers: {
                    'X-Session-ID': this.sessionId
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.submissions = data.data || [];
                this.applyFilters();
                this.updateDashboard();
                this.showNotification('Данные успешно загружены', 'success');
            } else {
                throw new Error(data.message || 'Ошибка загрузки данных');
            }
            
        } catch (error) {
            console.error('Error loading submissions:', error);
            this.showNotification('Ошибка загрузки данных: ' + error.message, 'error');
        }
    }
    
    applyFilters() {
        let filtered = [...this.submissions];
        
        // Фильтр по статусу
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(s => s.status === this.currentFilter);
        }
        
        // Фильтр по дате
        if (this.currentDateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(s => {
                const date = new Date(s.date);
                
                switch (this.currentDateFilter) {
                    case 'today':
                        return date >= today;
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return date >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return date >= monthAgo;
                    default:
                        return true;
                }
            });
        }
        
        // Поиск
        if (this.currentSearch) {
            filtered = filtered.filter(s => {
                const searchIn = [
                    s.name,
                    s.surname,
                    s.email,
                    s.phone
                ].filter(Boolean).join(' ').toLowerCase();
                
                return searchIn.includes(this.currentSearch);
            });
        }
        
        this.filteredSubmissions = filtered;
        this.currentPage = 1;
        this.renderSubmissionsTable();
        this.updatePagination();
    }
    
    renderSubmissionsTable() {
        const tbody = document.getElementById('submissionsTableBody');
        if (!tbody) return;
        
        // Вычисляем какие элементы показывать
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageSubmissions = this.filteredSubmissions.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        if (pageSubmissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem; color: var(--admin-text-light);">
                        <i data-feather="inbox" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                        <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">Нет заявок</div>
                        <div style="font-size: 0.9rem;">Заявки появятся здесь после отправки формы на сайте</div>
                    </td>
                </tr>
            `;
            feather.replace();
            return;
        }
        
        pageSubmissions.forEach(submission => {
            const row = this.createSubmissionRow(submission);
            tbody.appendChild(row);
        });
        
        // Обновляем счетчики
        this.updateTableCounters();
        
        // Обновляем иконки
        feather.replace();
    }
    
    createSubmissionRow(submission) {
        const row = document.createElement('tr');
        
        // Дата в читаемом формате
        const date = new Date(submission.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Текст статуса
        const statusText = this.getStatusText(submission.status);
        const statusClass = `status-${submission.status}`;
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="submission-checkbox" data-id="${submission.id}">
            </td>
            <td>
                <div class="submission-name">
                    <strong>${submission.name}</strong>
                    ${submission.surname ? `<br><span style="color: var(--admin-text-light); font-size: 0.9em;">${submission.surname}</span>` : ''}
                </div>
            </td>
            <td>
                <div class="contact-info">
                    <a href="mailto:${submission.email}" class="contact-email">${submission.email}</a>
                    ${submission.phone ? `<div class="contact-phone">${submission.phone}</div>` : ''}
                </div>
            </td>
            <td>${formattedDate}</td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-button view" data-id="${submission.id}" title="Просмотр">
                        <i data-feather="eye"></i>
                    </button>
                    <button class="table-button delete" data-id="${submission.id}" title="Удалить">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Добавляем обработчики для кнопок
        const viewButton = row.querySelector('.table-button.view');
        const deleteButton = row.querySelector('.table-button.delete');
        
        if (viewButton) {
            viewButton.addEventListener('click', () => this.showSubmissionDetails(submission.id));
        }
        
        if (deleteButton) {
            deleteButton.addEventListener('click', () => this.confirmDelete(submission.id));
        }
        
        return row;
    }
    
    getStatusText(status) {
        const statuses = {
            'new': 'Новая',
            'viewed': 'Просмотрена',
            'contacted': 'Связались',
            'completed': 'Завершена',
            'rejected': 'Отклонена'
        };
        return statuses[status] || status;
    }
    
    updateTableCounters() {
        const showingCount = document.getElementById('showingCount');
        const totalCount = document.getElementById('totalCount');
        
        if (showingCount) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, this.filteredSubmissions.length);
            showingCount.textContent = `${start}-${end}`;
        }
        
        if (totalCount) {
            totalCount.textContent = this.filteredSubmissions.length;
        }
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);
        const paginationNumbers = document.querySelector('.pagination-numbers');
        const prevButton = document.querySelector('.pagination-button.prev');
        const nextButton = document.querySelector('.pagination-button.next');
        
        if (!paginationNumbers) return;
        
        // Очищаем кнопки
        paginationNumbers.innerHTML = '';
        
        // Создаем кнопки страниц
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.className = `pagination-number ${i === this.currentPage ? 'active' : ''}`;
            button.textContent = i;
            button.addEventListener('click', () => this.goToPage(i));
            paginationNumbers.appendChild(button);
        }
        
        // Обновляем кнопки навигации
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
            prevButton.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }
        
        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
            nextButton.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderSubmissionsTable();
        this.updatePagination();
    }
    
    async showSubmissionDetails(submissionId) {
        const submission = this.submissions.find(s => s.id === submissionId);
        if (!submission) return;
        
        const modal = document.getElementById('submissionModal');
        const modalBody = document.getElementById('submissionDetails');
        const statusSelect = document.getElementById('modalStatusSelect');
        
        if (!modal || !modalBody || !statusSelect) return;
        
        // Заполняем детали
        const date = new Date(submission.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        modalBody.innerHTML = `
            <div class="submission-details">
                <div class="detail-section">
                    <h4 class="detail-title">Контактная информация</h4>
                    <div class="detail-row">
                        <div class="detail-item">
                            <div class="detail-label">Имя</div>
                            <div class="detail-value">${submission.name}</div>
                        </div>
                        ${submission.surname ? `
                        <div class="detail-item">
                            <div class="detail-label">Фамилия</div>
                            <div class="detail-value">${submission.surname}</div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="detail-row">
                        <div class="detail-item">
                            <div class="detail-label">Email</div>
                            <div class="detail-value email">${submission.email}</div>
                        </div>
                        ${submission.phone ? `
                        <div class="detail-item">
                            <div class="detail-label">Телефон</div>
                            <div class="detail-value phone">${submission.phone}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4 class="detail-title">Метаданные</h4>
                    <div class="detail-row">
                        <div class="detail-item">
                            <div class="detail-label">Дата отправки</div>
                            <div class="detail-value">${formattedDate}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Статус</div>
                            <div class="detail-value">
                                <span class="status-badge status-${submission.status}">
                                    ${this.getStatusText(submission.status)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-item">
                            <div class="detail-label">IP адрес</div>
                            <div class="detail-value">${submission.ip || 'Неизвестно'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Устанавливаем текущий статус
        statusSelect.value = submission.status;
        
        // Сохраняем ID заявки в модальном окне
        modal.dataset.submissionId = submissionId;
        
        // Показываем модальное окно
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        feather.replace();
    }
    
    closeModal() {
        const modal = document.getElementById('submissionModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
    
    async saveSubmissionStatus() {
        const modal = document.getElementById('submissionModal');
        const statusSelect = document.getElementById('modalStatusSelect');
        
        if (!modal || !statusSelect) return;
        
        const submissionId = modal.dataset.submissionId;
        const newStatus = statusSelect.value;
        
        if (!submissionId) return;
        
        try {
            const response = await fetch(`/api/submissions/${submissionId}/status`, {
                method: 'PUT',
                headers: {
                    'X-Session-ID': this.sessionId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Обновляем локальные данные
                const index = this.submissions.findIndex(s => s.id === submissionId);
                if (index !== -1) {
                    this.submissions[index] = data.data;
                }
                
                // Обновляем таблицу
                this.applyFilters();
                
                // Закрываем модальное окно
                this.closeModal();
                
                this.showNotification('Статус успешно обновлен', 'success');
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('Error updating status:', error);
            this.showNotification('Ошибка обновления статуса', 'error');
        }
    }
    
    confirmDelete(submissionId) {
        if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
            this.deleteSubmission(submissionId);
        }
    }
    
    async deleteSubmission(submissionId = null) {
        const id = submissionId || document.getElementById('submissionModal').dataset.submissionId;
        
        if (!id) return;
        
        try {
            const response = await fetch(`/api/submissions/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Session-ID': this.sessionId
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Удаляем из локальных данных
                this.submissions = this.submissions.filter(s => s.id !== id);
                
                // Обновляем таблицу
                this.applyFilters();
                
                // Закрываем модальное окно если оно открыто
                this.closeModal();
                
                this.showNotification('Заявка успешно удалена', 'success');
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('Error deleting submission:', error);
            this.showNotification('Ошибка удаления заявки', 'error');
        }
    }
    
    async exportToCSV() {
        try {
            const response = await fetch('/api/submissions/export/csv', {
                headers: {
                    'X-Session-ID': this.sessionId
                }
            });
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting:', error);
            this.showNotification('Ошибка экспорта', 'error');
        }
    }
    
    updateDashboard() {
        // Обновляем счетчики
        const total = this.submissions.length;
        const newCount = this.submissions.filter(s => s.status === 'new').length;
        const contactedCount = this.submissions.filter(s => s.status === 'contacted').length;
        const completedCount = this.submissions.filter(s => s.status === 'completed').length;
        
        const totalElement = document.getElementById('totalSubmissions');
        const newElement = document.getElementById('newSubmissions');
        const contactedElement = document.getElementById('contactedSubmissions');
        const completedElement = document.getElementById('completedSubmissions');
        const badgeElement = document.getElementById('newSubmissionsBadge');
        
        if (totalElement) totalElement.textContent = total;
        if (newElement) newElement.textContent = newCount;
        if (contactedElement) contactedElement.textContent = contactedCount;
        if (completedElement) completedElement.textContent = completedCount;
        if (badgeElement) badgeElement.textContent = newCount > 99 ? '99+' : newCount;
        
        // Обновляем список последних заявок
        this.updateRecentSubmissions();
    }
    
    updateRecentSubmissions() {
        const recentList = document.getElementById('recentSubmissionsList');
        if (!recentList) return;
        
        // Берем последние 5 заявок
        const recent = [...this.submissions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        recentList.innerHTML = '';
        
        if (recent.length === 0) {
            recentList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--admin-text-light);">
                    <i data-feather="inbox" style="width: 32px; height: 32px; margin-bottom: 0.5rem;"></i>
                    <div>Нет последних заявок</div>
                </div>
            `;
            feather.replace();
            return;
        }
        
        recent.forEach(submission => {
            const date = new Date(submission.date);
            const timeAgo = this.getTimeAgo(date);
            
            const item = document.createElement('div');
            item.className = 'recent-item';
            item.innerHTML = `
                <div class="recent-avatar">
                    <i data-feather="user"></i>
                </div>
                <div class="recent-info">
                    <div class="recent-name">${submission.name} ${submission.surname || ''}</div>
                    <div class="recent-email">${submission.email}</div>
                </div>
                <div class="recent-time">${timeAgo}</div>
            `;
            recentList.appendChild(item);
        });
        
        feather.replace();
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins} мин. назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч. назад`;
        } else if (diffDays === 1) {
            return 'Вчера';
        } else {
            return `${diffDays} дн. назад`;
        }
    }
    
    updateActivityChart() {
        // Упрощенная версия - без графика
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--admin-text-light);">
                    <div style="text-align: center;">
                        <i data-feather="bar-chart-2" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                        <div>График активности</div>
                        <div style="font-size: 0.9em; margin-top: 0.5rem;">Для просмотра нужны данные за несколько дней</div>
                    </div>
                </div>
            `;
            feather.replace();
        }
    }
    
    switchSection(sectionId) {
        // Обновляем навигацию
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Обновляем контент
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionId}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Обновляем заголовок
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const titles = {
                'dashboard': 'Главная',
                'submissions': 'Заявки',
                'analytics': 'Аналитика',
                'users': 'Пользователи',
                'security': 'Безопасность',
                'settings': 'Настройки'
            };
            pageTitle.textContent = titles[sectionId] || sectionId;
        }
    }
    
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark-theme');
        const themeIcon = document.querySelector('.theme-icon');
        
        if (isDark) {
            body.classList.remove('dark-theme');
            localStorage.setItem('admin-theme', 'light');
            themeIcon.setAttribute('data-feather', 'moon');
        } else {
            body.classList.add('dark-theme');
            localStorage.setItem('admin-theme', 'dark');
            themeIcon.setAttribute('data-feather', 'sun');
        }
        
        feather.replace();
    }
    
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'X-Session-ID': this.sessionId,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Очищаем хранилище
            localStorage.removeItem('adminSessionId');
            
            // Перенаправляем на страницу входа
            this.redirectToLogin();
        }
    }
    
    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            'success': 'check-circle',
            'error': 'alert-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        
        notification.innerHTML = `
            <i data-feather="${icons[type] || 'info'}" class="notification-icon"></i>
            <span class="notification-text">${message}</span>
            <button class="notification-close">
                <i data-feather="x"></i>
            </button>
        `;
        
        // Добавляем стили
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.25rem;
                background: var(--admin-surface);
                border: 1px solid var(--admin-border);
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            
            .notification-success {
                border-color: rgba(16, 185, 129, 0.3);
            }
            
            .notification-error {
                border-color: rgba(239, 68, 68, 0.3);
            }
            
            .notification-warning {
                border-color: rgba(245, 158, 11, 0.3);
            }
            
            .notification-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .notification-success .notification-icon {
                color: var(--admin-success);
            }
            
            .notification-error .notification-icon {
                color: var(--admin-error);
            }
            
            .notification-warning .notification-icon {
                color: var(--admin-warning);
            }
            
            .notification-info .notification-icon {
                color: var(--admin-info);
            }
            
            .notification-text {
                flex: 1;
                font-family: 'Inter', sans-serif;
                font-size: 0.9rem;
                color: var(--admin-text);
            }
            
            .notification-close {
                background: none;
                border: none;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--admin-text-light);
                transition: color 0.2s ease;
            }
            
            .notification-close:hover {
                color: var(--admin-text);
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        feather.replace();
        
        // Добавляем обработчик закрытия
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        });
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    notification.remove();
                    style.remove();
                }, 300);
            }
        }, 5000);
    }
    
    showAdminPanel() {
        const loadingScreen = document.getElementById('loadingScreen');
        const adminContainer = document.getElementById('adminContainer');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (adminContainer) adminContainer.style.display = 'flex';
        
        // Восстанавливаем тему
        const savedTheme = localStorage.getItem('admin-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.setAttribute('data-feather', 'sun');
                feather.replace();
            }
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});