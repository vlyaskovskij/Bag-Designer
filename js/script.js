/**
* Uber Bag Designer - Main Application Script
*/
let currentLanguage = 'en';
let bagImage = null;
let canvas, ctx;
let placedStickers = [];
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let selectedSticker = null;
let dpr = window.devicePixelRatio || 1;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing Uber Bag Designer...');
    addAnimationStyles();
    console.log('App initialized successfully');
}

function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .sticker-item {
            opacity: 0;
            transform: scale(0.8);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// Функции выбора языка и переходов
function selectLanguage(lang) {
    currentLanguage = lang;
    updateTexts();
    const languageScreen = document.getElementById('languageScreen');
    const designerScreen = document.getElementById('designerScreen');
    
    languageScreen.classList.add('slide-out');
    setTimeout(() => {
        languageScreen.classList.remove('active', 'slide-out');
        designerScreen.classList.add('active', 'slide-in');
        initializeDesigner();
    }, 600);
}

function updateTexts() {
    const texts = translations[currentLanguage];
    // Обновление всех текстовых элементов
    const elements = [
        'title', 'backText', 'stickersTitle', 'saveText',
        'successTitle', 'instructionText', 'downloadText',
        'closeText', 'loadingBag', 'controlTitle',
        'rotateLabel', 'deleteText', 'deselectText'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element && texts[id]) {
            element.textContent = texts[id];
        }
    });
}

function goBack() {
    const languageScreen = document.getElementById('languageScreen');
    const designerScreen = document.getElementById('designerScreen');
    
    designerScreen.classList.add('slide-out');
    designerScreen.classList.remove('slide-in');
    
    setTimeout(() => {
        designerScreen.classList.remove('active', 'slide-out');
        languageScreen.classList.add('active');
        
        // Сброс состояния
        placedStickers = [];
        selectedSticker = null;
        hideControlPanel();
        
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, 600);
}

// Инициализация дизайнера
function initializeDesigner() {
    canvas = document.getElementById('bagCanvas');
    ctx = canvas.getContext('2d');
    
    // включаем сглаживание и ставим максимальное качество
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupCanvasEvents();
    setupControls();
    loadBagImage();
    loadStickers();
}

// Настройка контролов
function setupControls() {
    const rotateSlider = document.getElementById('rotateSlider');
    const rotateValue = document.getElementById('rotateValue');
    
    if (!rotateSlider || !rotateValue) return;
    
    // показываем начальное значение
    rotateValue.textContent = `${rotateSlider.value}°`;
    
    rotateSlider.addEventListener('input', function() {
        rotateValue.textContent = `${this.value}°`;
        if (selectedSticker) {
            selectedSticker.rotation = parseFloat(this.value);
            redrawCanvas();
        }
    });
}

// Панель управления
function showControlPanel() {
    const controlPanel = document.getElementById('controlPanel');
    if (!controlPanel) return;
    
    controlPanel.style.display = 'block';
    controlPanel.style.animation = 'slideInFromRight 0.3s ease forwards';
    updateControls();
}

function hideControlPanel() {
    const controlPanel = document.getElementById('controlPanel');
    if (controlPanel) {
        controlPanel.style.animation = 'slideOutToLeft 0.3s ease forwards';
        setTimeout(() => {
            controlPanel.style.display = 'none';
        }, 300);
    }
}

function updateControls() {
    if (!selectedSticker) return;
    
    const rotateSlider = document.getElementById('rotateSlider');
    const rotateValue = document.getElementById('rotateValue');
    
    if (rotateSlider && rotateValue) {
        rotateSlider.value = selectedSticker.rotation || 0;
        rotateValue.textContent = `${rotateSlider.value}°`;
    }
    
    // Показать информацию о размере наклейки
    updateStickerInfo();
}

function updateStickerInfo() {
    if (!selectedSticker) return;
    
    const config = getStickerConfig(selectedSticker.stickerId);
    if (!config) return;
    
    // Добавить или обновить информацию о размере
    let infoElement = document.getElementById('stickerSizeInfo');
    if (!infoElement) {
        infoElement = document.createElement('div');
        infoElement.id = 'stickerSizeInfo';
        infoElement.style.cssText = `display:none;`;
        
        const controlPanel = document.getElementById('controlPanel');
        if (controlPanel) {
            controlPanel.appendChild(infoElement);
        }
    }
    
    const sizeText = translations[currentLanguage].stickerInfo || 'Size:';
    infoElement.innerHTML = `
        <strong>${config.name}</strong><br>
        ${sizeText} ${config.width/10}×${config.height/10} см
    `;
}

// Загрузка изображений из репозитория
function loadBagImage() {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Добавляем для избежания CORS проблем
    
    img.onload = function() {
        bagImage = img;
        const loadingElement = document.getElementById('loadingBag');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        redrawCanvas();
        console.log('Bag image loaded successfully');
    };
    
    img.onerror = function() {
        console.error('Failed to load bag image');
        const loadingElement = document.getElementById('loadingBag');
        if (loadingElement) {
            loadingElement.textContent = 'Failed to load bag image';
        }
    };
    
    img.src = getBagImagePath();
}

function loadStickers() {
    const stickersList = document.getElementById('stickersList');
    if (stickersList) {
        stickersList.innerHTML = '<div class="loading">Loading stickers...</div>';
    }
    
    const loadedStickers = [];
    let loadedCount = 0;
    let errorCount = 0;
    const totalStickers = APP_CONFIG.MAX_STICKERS;
    
    // Загрузка всех наклеек
    for (let i = 1; i <= totalStickers; i++) {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Добавляем для избежания CORS проблем
        
        img.onload = function() {
            loadedStickers.push({
                id: i,
                src: getStickerImagePath(i),
                image: img,
                config: getStickerConfig(i)
            });
            loadedCount++;
            checkLoadComplete();
        };
        
        img.onerror = function() {
            errorCount++;
            console.warn(`Sticker ${i} not found`);
            checkLoadComplete();
        };
        
        function checkLoadComplete() {
            if (loadedCount + errorCount >= totalStickers) {
                displayStickers(loadedStickers.sort((a, b) => a.id - b.id));
            }
        }
        
        img.src = getStickerImagePath(i);
    }
}

function displayStickers(stickers) {
    const stickersList = document.getElementById('stickersList');
    if (!stickersList) return;

    stickersList.innerHTML = '';
    if (stickers.length === 0) {
        stickersList.innerHTML = '<div class="no-stickers">No stickers found</div>';
        return;
    }

    stickers.forEach((sticker, index) => {
        const stickerDiv = document.createElement('div');
        stickerDiv.className = 'sticker-item';
        
        // Добавляем обработчики для мыши И касаний
        const addSticker = (e) => {
            e.preventDefault();
            e.stopPropagation();
            addStickerToBag(sticker);
        };
        
        stickerDiv.addEventListener('click', addSticker);
        stickerDiv.addEventListener('touchend', addSticker);

        const config = sticker.config;
        stickerDiv.title = `${config.name}\nРазмер: ${config.width/10}×${config.height/10} см`;

        const img = document.createElement('img');
        img.src = sticker.src;
        img.alt = config.name;
        img.style.pointerEvents = 'none'; // Предотвращаем события на изображении
        
        stickerDiv.appendChild(img);
        stickersList.appendChild(stickerDiv);

        // Анимация появления
        setTimeout(() => {
            stickerDiv.style.opacity = '1';
            stickerDiv.style.transform = 'scale(1)';
        }, index * 100);
    });

    console.log(`Loaded ${stickers.length} stickers`);
}

// Функция для добавления наклейки на сумку
function addStickerToBag(sticker) {
    console.log('Adding sticker to bag:', sticker); // Для отладки
    
    const config = sticker.config;
    const canvasSize = calculateCanvasSize(config.width, config.height);
    
    // Используем CSS-размеры для позиционирования
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    
    const placedSticker = {
        image: sticker.image,
        x: cssWidth / 2 - canvasSize.width / 2,
        y: cssHeight / 2 - canvasSize.height / 2,
        width: canvasSize.width,
        height: canvasSize.height,
        rotation: 0,
        id: Date.now(),
        stickerId: sticker.id,
        realWidth: config.width,
        realHeight: config.height,
        type: config.type,
        name: config.name
    };
    
    placedStickers.push(placedSticker);
    selectedSticker = placedSticker;
    showControlPanel();
    redrawCanvas();
    
    console.log(`Added sticker: ${config.name}, Position: ${placedSticker.x}, ${placedSticker.y}, Size: ${placedSticker.width}x${placedSticker.height}`);
}

// Функции расчета размеров и масштабирования
function calculateCanvasSize(realWidthMM, realHeightMM) {
    // Используем CSS-размеры для расчета, а не физические
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    
    const scaleX = cssWidth / REAL_BAG_SIZE.width;
    const scaleY = cssHeight / REAL_BAG_SIZE.height;
    const scale = Math.min(scaleX, scaleY);
    
    return {
        width: realWidthMM * scale,
        height: realHeightMM * scale
    };
}

function resizeCanvas() {
    if (!canvas) return;
    
    // вычисляем размер в CSS-пикселях
    const container = canvas.parentElement;
    const maxWidth = Math.min(container.clientWidth - 60, 500);
    const maxHeight = Math.min(window.innerHeight * 0.6, 500);
    const bagAR = REAL_BAG_SIZE.width / REAL_BAG_SIZE.height;
    
    let cssWidth, cssHeight;
    if (maxWidth / maxHeight > bagAR) {
        cssHeight = maxHeight;
        cssWidth = cssHeight * bagAR;
    } else {
        cssWidth = maxWidth;
        cssHeight = cssWidth / bagAR;
    }
    
    // ставим видимые размеры
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    
    // ставим «физические» размеры под DPR
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    
    // ресетим трансформ и масштабируем контекст под DPR
    if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        // восстанавливаем качество
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }
    
    redrawCanvas();
}

// Настройка событий канваса
function setupCanvasEvents() {
    // События мыши
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    
    // События касания
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd, { passive: false });
}

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    // Используем CSS-размеры для расчета позиции
    const scaleX = (canvas.width / dpr) / rect.width;
    const scaleY = (canvas.height / dpr) / rect.height;
    
    let clientX, clientY;
    if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleStart(e) {
    e.preventDefault();
    const pos = getEventPos(e);
    
    // Проверяем клик по размещенным наклейкам
    for (let i = placedStickers.length - 1; i >= 0; i--) {
        const sticker = placedStickers[i];
        if (isPointInSticker(pos, sticker)) {
            isDragging = true;
            selectedSticker = sticker;
            showControlPanel();
            dragOffset = {
                x: pos.x - sticker.x,
                y: pos.y - sticker.y
            };
            redrawCanvas();
            return;
        }
    }
    
    // Если не кликнули по наклейке, убираем выделение
    if (selectedSticker) {
        deselectSticker();
    }
}

function isPointInSticker(point, sticker) {
    return point.x >= sticker.x &&
           point.x <= sticker.x + sticker.width &&
           point.y >= sticker.y &&
           point.y <= sticker.y + sticker.height;
}

function handleMove(e) {
    e.preventDefault();
    if (isDragging && selectedSticker) {
        const pos = getEventPos(e);
        selectedSticker.x = pos.x - dragOffset.x;
        selectedSticker.y = pos.y - dragOffset.y;
        
        // Используем CSS-размеры для границ
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        
        selectedSticker.x = Math.max(0, Math.min(cssWidth - selectedSticker.width, selectedSticker.x));
        selectedSticker.y = Math.max(0, Math.min(cssHeight - selectedSticker.height, selectedSticker.y));
        redrawCanvas();
    }
}

function handleEnd(e) {
    e.preventDefault();
    isDragging = false;
}

// Отрисовка канваса
function redrawCanvas() {
    if (!canvas || !ctx) return;
    
    // при любом перерисовывании убеждаемся, что сглаживание включено
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // очищаем в CSS-координатах
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // рисуем сумку
    if (bagImage) {
        ctx.drawImage(
            bagImage,
            0, 0,
            canvas.width / dpr,
            canvas.height / dpr
        );
    }
    
    // рисуем наклейки
    placedStickers.forEach(sticker => {
        ctx.save();
        
        // центр наклейки
        ctx.translate(
            sticker.x + sticker.width / 2,
            sticker.y + sticker.height / 2
        );
        
        if (sticker.rotation) {
            ctx.rotate(sticker.rotation * Math.PI / 180);
        }
        
        // размер и положение в CSS px
        ctx.drawImage(
            sticker.image,
            -sticker.width / 2,
            -sticker.height / 2,
            sticker.width,
            sticker.height
        );
        
        ctx.restore();
        
    });
}

// Функции управления наклейками
function deleteSelectedSticker() {
    if (selectedSticker) {
        const index = placedStickers.indexOf(selectedSticker);
        if (index > -1) {
            placedStickers.splice(index, 1);
            selectedSticker = null;
            hideControlPanel();
            redrawCanvas();
        }
    }
}

function deselectSticker() {
    selectedSticker = null;
    hideControlPanel();
    redrawCanvas();
}

// Сохранение дизайна
function saveBag(event) {
    // Предотвращаем стандартное поведение кнопки
    if (event) {
        event.preventDefault();
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const saveText = document.getElementById('saveText');
    
    if (saveBtn) saveBtn.disabled = true;
    if (saveText) saveText.textContent = 'Saving...';
    
    // Создаем финальное изображение в высоком разрешении
    const finalCanvas = document.createElement('canvas');
    const pixelsPerMM = APP_CONFIG.CANVAS_QUALITY || 2;
    
    finalCanvas.width = REAL_BAG_SIZE.width * pixelsPerMM;
    finalCanvas.height = REAL_BAG_SIZE.height * pixelsPerMM;
    
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    
    // Рисуем сумку в высоком разрешении
    if (bagImage) {
        finalCtx.drawImage(bagImage, 0, 0, finalCanvas.width, finalCanvas.height);
    }
    
    // Масштабируем и рисуем наклейки в финальном разрешении
    placedStickers.forEach(sticker => {
        finalCtx.save();
        
        // Рассчитываем финальную позицию и размер
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        
        const finalX = (sticker.x / cssWidth) * finalCanvas.width;
        const finalY = (sticker.y / cssHeight) * finalCanvas.height;
        const finalWidth = sticker.realWidth * pixelsPerMM;
        const finalHeight = sticker.realHeight * pixelsPerMM;
        
        finalCtx.translate(finalX + finalWidth / 2, finalY + finalHeight / 2);
        
        if (sticker.rotation) {
            finalCtx.rotate(sticker.rotation * Math.PI / 180);
        }
        
        finalCtx.drawImage(
            sticker.image,
            -finalWidth / 2,
            -finalHeight / 2,
            finalWidth,
            finalHeight
        );
        
        finalCtx.restore();
    });
    
    // Конвертируем в blob для скачивания
    finalCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        window.designImageUrl = url;
        
        if (saveBtn) saveBtn.disabled = false;
        if (saveText && translations[currentLanguage]) {
            saveText.textContent = translations[currentLanguage].saveText;
        }
        
        showResultModal();
    }, 'image/png');
    
    return false;
}

function downloadImage() {
    if (window.designImageUrl) {
        const link = document.createElement('a');
        link.download = 'uber-bag-design.png';
        link.href = window.designImageUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Модальные окна
function showResultModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

function closeModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}
