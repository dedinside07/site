document.addEventListener('DOMContentLoaded', () => {
            // Инициализация иконок
            feather.replace();
            
            // Обновлённый класс студии
            const studio = new CreativeStudio();
            studio.init();
            
            // Мобильное меню
            const menuToggle = document.getElementById('menuToggle');
            const templeNav = document.querySelector('.temple-nav');
            
            menuToggle.addEventListener('click', () => {
                const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
                menuToggle.setAttribute('aria-expanded', !isExpanded);
                menuToggle.classList.toggle('active');
                templeNav.classList.toggle('active');
            });
            
            // Плавная навигация
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        
                        // Обновляем активный элемент навигации
                        document.querySelectorAll('.nav-item').forEach(item => {
                            item.classList.remove('active');
                        });
                        this.classList.add('active');
                    }
                });
            });
            
            // Анимация заголовка
            setTimeout(() => {
                const letters = document.querySelectorAll('.title-char');
                letters.forEach((letter, index) => {
                    setTimeout(() => {
                        letter.classList.add('awake');
                    }, index * 80);
                });
            }, 500);
        });

        // Класс творческой студии
        class CreativeStudio {
            constructor() {
                this.isInspirationActive = false;
                this.creativeFlow = 0;
            }
            
            init() {
                this.createSubtleEffects();
                this.setupInteractiveElements();
                this.setupInspirationButton();
                this.setupScrollAnimations();
                this.setupPulseAnimation();
            }
            
            createSubtleEffects() {
                // Создаём деликатные эффекты для новой студии
                this.createCreativeParticles();
            }
            
            createCreativeParticles() {
                const ctaSection = document.querySelector('.project-cta');
                if (!ctaSection) return;
                
                const decoration = ctaSection.querySelector('.cta-decoration');
                if (!decoration) return;
                
                // Создаём парящие орбы
                for (let i = 1; i <= 3; i++) {
                    const orb = document.createElement('div');
                    orb.className = `floating-orb orb-${i}`;
                    
                    const size = 60 + Math.random() * 40;
                    const duration = 20 + Math.random() * 10;
                    const delay = Math.random() * 5;
                    
                    const colors = [
                        'rgba(255, 141, 161, 0.03)',
                        'rgba(184, 161, 255, 0.025)',
                        'rgba(138, 255, 209, 0.025)'
                    ];
                    const color = colors[i - 1];
                    
                    orb.style.cssText = `
                        position: absolute;
                        width: ${size}px;
                        height: ${size}px;
                        background: radial-gradient(circle, ${color} 0%, transparent 70%);
                        border-radius: 50%;
                        filter: blur(15px);
                        animation: orbFloat ${duration}s infinite ease-in-out ${delay}s;
                        z-index: -1;
                    `;
                    
                    // Позиционируем орбы
                    switch(i) {
                        case 1:
                            orb.style.top = '20%';
                            orb.style.left = '10%';
                            break;
                        case 2:
                            orb.style.top = '60%';
                            orb.style.right = '15%';
                            break;
                        case 3:
                            orb.style.bottom = '30%';
                            orb.style.left = '40%';
                            break;
                    }
                    
                    decoration.appendChild(orb);
                }
            }
            
            setupInteractiveElements() {
                // Интерактивные элементы
                const interactiveElements = [
                    ...document.querySelectorAll('.path-card'),
                    ...document.querySelectorAll('.nav-item'),
                    ...document.querySelectorAll('.cta-button'),
                    ...document.querySelectorAll('.foundation-link')
                ];
                
                interactiveElements.forEach(element => {
                    element.addEventListener('mouseenter', () => this.gentleActivate(element));
                    element.addEventListener('mouseleave', () => this.gentleDeactivate(element));
                    element.addEventListener('focus', () => this.gentleActivate(element));
                    element.addEventListener('blur', () => this.gentleDeactivate(element));
                });
            }
            
            gentleActivate(element) {
                element.classList.add('gentle-hover');
                
                // Дополнительный эффект для CTA кнопок
                if (element.classList.contains('cta-button')) {
                    const icon = element.querySelector('.btn-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.1)';
                    }
                }
            }
            
            gentleDeactivate(element) {
                element.classList.remove('gentle-hover');
                
                if (element.classList.contains('cta-button')) {
                    const icon = element.querySelector('.btn-icon');
                    if (icon) {
                        icon.style.transform = '';
                    }
                }
            }
            
            setupInspirationButton() {
                const inspirationButton = document.querySelector('.magic-call');
                if (!inspirationButton) return;
                
                inspirationButton.addEventListener('click', () => {
                    this.toggleInspiration();
                    inspirationButton.classList.toggle('active');
                    
                    // Анимация нажатия
                    inspirationButton.style.transform = 'scale(0.97)';
                    setTimeout(() => {
                        inspirationButton.style.transform = '';
                    }, 150);
                });
            }
            
            toggleInspiration() {
                this.isInspirationActive = !this.isInspirationActive;
                
                if (this.isInspirationActive) {
                    this.activateInspirationMode();
                } else {
                    this.deactivateInspirationMode();
                }
            }
            
            activateInspirationMode() {
                console.log('✨ Режим вдохновения активирован');
                
                // Усиливаем эффекты градиента
                document.querySelectorAll('.gradient-flow').forEach(flow => {
                    flow.style.opacity = '0.15';
                });
                
                // Анимация для пульса студии
                const pulseElements = document.querySelectorAll('.indicator-pulse, .gradient-bar');
                pulseElements.forEach(el => {
                    el.style.animationDuration = '1.5s';
                });
            }
            
            deactivateInspirationMode() {
                console.log('🌙 Режим вдохновения деактивирован');
                
                document.querySelectorAll('.gradient-flow').forEach(flow => {
                    flow.style.opacity = '0.08';
                });
                
                const pulseElements = document.querySelectorAll('.indicator-pulse, .gradient-bar');
                pulseElements.forEach(el => {
                    el.style.animationDuration = '';
                });
            }
            
            setupScrollAnimations() {
                // Анимация появления при скролле
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('revealed');
                        }
                    });
                }, { 
                    threshold: 0.1,
                    rootMargin: '50px'
                });
                
                // Наблюдаем за секциями
                document.querySelectorAll('.philosophy-section, .path-card, .studio-pulse, .project-cta').forEach(el => {
                    observer.observe(el);
                });
            }
            
            setupPulseAnimation() {
                // Динамическое обновление показателей пульса
                const updatePulse = () => {
                    const values = {
                        focus: 90 + Math.random() * 10,
                        flow: 80 + Math.random() * 15
                    };
                    
                    document.querySelectorAll('.reading-value').forEach(valueEl => {
                        const label = valueEl.previousElementSibling?.textContent;
                        if (label?.includes('СОСРЕДОТОЧЕННОСТЬ')) {
                            valueEl.textContent = `${Math.round(values.focus)}%`;
                        } else if (label?.includes('КРЕАТИВНЫЙ ПОТОК')) {
                            valueEl.textContent = `${Math.round(values.flow)}%`;
                        }
                    });
                };
                
                // Обновляем каждые 10 секунд для эффекта "живого" пульса
                setInterval(updatePulse, 10000);
            }
        }

        // Добавляем CSS анимацию для орбов
        const style = document.createElement('style');
        style.textContent = `
            @keyframes orbFloat {
                0%, 100% { 
                    transform: translate(0, 0) scale(1); 
                    opacity: 0.1; 
                }
                33% { 
                    transform: translate(20px, -15px) scale(1.1); 
                    opacity: 0.15; 
                }
                66% { 
                    transform: translate(-10px, 10px) scale(0.95); 
                    opacity: 0.12; 
                }
            }
            
            .flow-visual {
                height: 2px;
                background: linear-gradient(90deg,
                    var(--magic-mint),
                    var(--magic-lavender),
                    var(--magic-blush));
                border-radius: 1px;
                width: 100%;
                animation: flowWave 4s infinite ease-in-out;
                background-size: 200% 100%;
            }
            
            @keyframes flowWave {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
        `;
        document.head.appendChild(style);