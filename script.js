let db;
let expenses = [];
let editId = null;
let currency = localStorage.getItem('currency') || 'EUR';
let language = localStorage.getItem('language') || (navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en');
let dateFormat = localStorage.getItem('dateFormat') || 'text';
let theme = localStorage.getItem('theme') || 'dark';
const isPwa = window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || window.navigator.standalone === true;

const currencySymbols = {
    EUR: '€',
    USD: '$',
    RUB: '₽',
    UAH: '₴'
};

const translations = {
    ru: {
        appHeader: 'Ежемесячные траты', totalTitle: 'Общая сумма', addTitle: 'Добавление', editTitle: 'Изменение',
        addButton: 'Добавить', editButton: 'Изменить', cancelButton: 'Отмена', deleteButton: 'Удалить',
        namePlaceholder: 'Название траты', sumPlaceholder: 'Сумма', datePlaceholder: 'Оплачено до',
        paidUntil: 'Оплачено до', warningButton: 'Понятно', settingsTitle: 'Настройки',
        currencyLabel: 'Валюта', languageLabel: 'Язык', dateFormatLabel: 'Формат даты',
        currencyEUR: 'Евро (€)', currencyUSD: 'Доллар ($)', currencyRUB: 'Рубль (₽)', currencyUAH: 'Гривна (₴)',
        dateFormatText: '15 сен 2025', dateFormatNumeric: '15.09.2025', themeLabel: 'Тема',
        darkTheme: 'Темная', lightTheme: 'Светлая', settingsButton: 'Сохранить',
        warningText: 'Все данные сохраняются только на вашем устройстве. Если вы очистите данные браузера - все ваши записи исчезнут.',
        deleteTitle: 'Удалить трату?', fillFields: 'Заполните все поля'
    },
    en: {
        appHeader: 'Monthly expenses', totalTitle: 'Total amount', addTitle: 'Adding', editTitle: 'Editing',
        addButton: 'Add', editButton: 'Edit', cancelButton: 'Cancel', deleteButton: 'Delete',
        namePlaceholder: 'Expense name', sumPlaceholder: 'Amount', datePlaceholder: 'Paid until',
        paidUntil: 'Paid until', warningButton: 'Got it', settingsTitle: 'Settings',
        currencyLabel: 'Currency', languageLabel: 'Language', dateFormatLabel: 'Date format',
        currencyEUR: 'Euro (€)', currencyUSD: 'Dollar ($)', currencyRUB: 'Ruble (₽)', currencyUAH: 'Hryvnia (₴)',
        dateFormatText: '15 Sep 2025', dateFormatNumeric: '15.09.2025', themeLabel: 'Theme',
        darkTheme: 'Dark', lightTheme: 'Light', settingsButton: 'Save',
        warningText: 'This site does not use accounts. All data is stored only on your device. If you clear your browser data, all your records will disappear.',
        deleteTitle: 'Delete expense?', fillFields: 'Please fill in all fields'
    }
};

const inputName = document.getElementById('inputName');
const inputSum = document.getElementById('inputSum');
const inputDate = document.getElementById('inputDate');
const btnAdd = document.getElementById('btnAdd');
const btnCancel = document.getElementById('btnCancel');
const list = document.getElementById('list');
const totalValue = document.getElementById('totalValue');
const appForm = document.getElementById('app-form');
const appFormAddBlockTitle = document.getElementById('app-form-add-block-title');
const settingsOpen = document.getElementById('settingsOpen');
const deleteModal = document.getElementById('deleteModal');
const deleteModalName = document.getElementById('deleteModalName');
const deleteCancel = document.getElementById('deleteCancel');
const deleteConfirm = document.getElementById('deleteConfirm');
const settingsScreen = document.getElementById('settingsScreen');
const currencySelect = document.getElementById('currencySelect');
const languageSelect = document.getElementById('languageSelect');
const dateFormatSelect = document.getElementById('dateFormatSelect');
const themeSelect = document.getElementById('themeSelect');
const settingsConfirm = document.getElementById('settingsConfirm');
let pendingDeleteId = null;
let pendingDeleteItem = null;
const loadingScreen = document.getElementById('loadingScreen');

document.body.classList.toggle('is-pwa', isPwa);
document.body.classList.toggle('is-browser', !isPwa);

function formatMoney(value) {
    const formattedValue = Number(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
    return formattedValue + ' ' + currencySymbols[currency];
}

function formatDate(dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);

    if (dateFormat === 'numeric') {
        return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
    }

    const monthNames = {
        ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
        en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    };

    return `${day} ${monthNames[language][month - 1]} ${year}`;
}

function applyTheme() {
    document.body.classList.toggle('light-theme', theme === 'light');
}

function applyLanguage() {
    const text = translations[language];
    document.documentElement.lang = language;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        if (text[key]) element.innerHTML = text[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        element.placeholder = text[element.dataset.i18nPlaceholder];
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        element.setAttribute('aria-label', text[element.dataset.i18nAriaLabel]);
    });

    document.querySelectorAll('option[data-i18n]').forEach(element => {
        element.textContent = text[element.dataset.i18n];
    });
}

applyLanguage();
applyTheme();

languageSelect.addEventListener('change', () => {
    language = languageSelect.value;
    applyLanguage();
    render();
});

themeSelect.addEventListener('change', () => {
    theme = themeSelect.value;
    applyTheme();
});

// ---------------------------
// IndexedDB INIT
// ---------------------------
const request = indexedDB.open("expensesDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const store = db.createObjectStore("expenses", { keyPath: "id" });
    store.createIndex("date", "date", { unique: false });
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadExpenses();
};

request.onerror = function() {
    alert("Ошибка при открытии базы данных");
};

// ---------------------------
// LOAD ALL EXPENSES
// ---------------------------
function loadExpenses() {
    const tx = db.transaction("expenses", "readonly");
    const store = tx.objectStore("expenses");
    const req = store.getAll();

    req.onsuccess = function() {
        expenses = req.result;
        render();
    };
}

// ---------------------------
// ADD OR UPDATE EXPENSE
// ---------------------------
btnAdd.addEventListener('click', () => {

    const name = inputName.value.trim();
    const sum = Number(inputSum.value.trim());
    const date = inputDate.value;

    if (!name || !sum || !date) {
        alert(translations[language].fillFields);
        return;
    }

    const tx = db.transaction("expenses", "readwrite");
    const store = tx.objectStore("expenses");

    if (editId !== null) {
        store.put({ id: editId, name, sum, date });
        editId = null;
    } else {
        store.add({ id: Date.now(), name, sum, date });
    }

    tx.oncomplete = () => {
        inputName.value = "";
        inputSum.value = "";
        inputDate.value = "";
        btnAdd.textContent = translations[language].addButton;
        btnCancel.style.display = 'none';
        btnCancel.style.visibility = 'hidden';
        appFormAddBlockTitle.textContent = translations[language].addTitle;
        loadExpenses();
    };
});

// ---------------------------
// DELETE EXPENSE
// ---------------------------
function deleteExpense(id, item = null) {
    if (item) {
        if (item.classList.contains("is-removing")) return;
        item.classList.add("is-removing");
    }

    const removeFromDatabase = () => {
    const tx = db.transaction("expenses", "readwrite");
    const store = tx.objectStore("expenses");
    store.delete(id);

    tx.oncomplete = () => {
        loadExpenses();
    };
    };

    if (item) {
        setTimeout(removeFromDatabase, 300);
    } else {
        removeFromDatabase();
    }
}

function openDeleteModal(expense, item) {
    pendingDeleteId = expense.id;
    pendingDeleteItem = item;
    deleteModalName.textContent = expense.name;
    deleteModal.style.display = "flex";
}

function closeDeleteModal() {
    pendingDeleteId = null;
    pendingDeleteItem = null;
    deleteModal.style.display = "none";
}

deleteConfirm.addEventListener("click", () => {
    if (pendingDeleteId !== null) {
        deleteExpense(pendingDeleteId, pendingDeleteItem);
    }
    closeDeleteModal();
});

deleteCancel.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) closeDeleteModal();
});

// ---------------------------
// RENDER LIST
// ---------------------------
function render() {
    expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = "";
    let total = 0;

    expenses.forEach(exp => {
        total += exp.sum;

        const item = document.createElement("div");
        item.className = "app-list-item";

        const content = document.createElement("div");
        content.className = "app-list-item-content";

        const left = document.createElement("div");
        left.className = "app-list-item-left";
        left.innerHTML = `
            <div class="app-list-item-name">${exp.name}</div>
            <div class="app-list-item-date">${translations[language].paidUntil}: ${formatDate(exp.date)}</div>
        `;

        const sum = document.createElement("div");
        sum.className = "app-list-item-sum";
        sum.textContent = formatMoney(exp.sum);

        const del = document.createElement("button");
        del.className = "app-list-item-delete";
        del.textContent = translations[language].deleteButton;
        del.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteExpense(exp.id, item);
        });

        const menu = document.createElement("button");
        menu.className = "app-list-item-menu";
        menu.type = "button";
        menu.setAttribute("aria-label", "Действия");
        menu.textContent = "⋮";
        menu.addEventListener("click", (e) => {
            e.stopPropagation();
            openDeleteModal(exp, item);
        });

        content.appendChild(left);
        content.appendChild(sum);
        content.appendChild(menu);
        item.appendChild(content);
        item.appendChild(del);

        content.addEventListener("click", () => {
            if (touchMoved) {
                touchMoved = false;
                return;
            }

            if (!isOpen) moreBlock.click();
            appFormAddBlockTitle.textContent = translations[language].editTitle;
            btnCancel.style.display = 'block';
            btnCancel.style.visibility = 'visible';
            inputName.value = exp.name;
            inputSum.value = exp.sum;
            inputDate.value = exp.date;
            editId = exp.id;
            btnAdd.textContent = translations[language].editButton;
        });

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartOffset = 0;
        let touchMoved = false;
        let horizontalSwipe = false;

        content.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== "touch") return;
            touchStartX = event.clientX;
            touchStartY = event.clientY;
            touchStartOffset = item.classList.contains("is-swiped") ? -100 : 0;
            touchMoved = false;
            horizontalSwipe = false;
            item.classList.add("is-dragging");
            content.style.transition = "none";
            content.setPointerCapture(event.pointerId);
        });

        content.addEventListener("pointermove", (event) => {
            if (event.pointerType !== "touch") return;
            const deltaX = event.clientX - touchStartX;
            const deltaY = event.clientY - touchStartY;
            if (!horizontalSwipe && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
                horizontalSwipe = true;
            }

            if (horizontalSwipe) {
                touchMoved = true;
                const offset = Math.min(0, Math.max(-100, touchStartOffset + deltaX));
                content.style.transform = `translateX(${offset}px)`;
            }
        });

        content.addEventListener("pointerup", (event) => {
            if (event.pointerType !== "touch") return;
            const deltaX = event.clientX - touchStartX;
            const offset = Math.min(0, Math.max(-100, touchStartOffset + deltaX));
            item.classList.remove("is-dragging");
            content.style.transition = "";
            if (offset < -50) {
                item.classList.add("is-swiped");
                content.style.transform = "translateX(-100px)";
            } else {
                item.classList.remove("is-swiped");
                content.style.transform = "translateX(0)";
            }
            if (touchMoved) event.preventDefault();
        });

        list.appendChild(item);
    });

    totalValue.textContent = formatMoney(total);
}

const calendarModal = document.getElementById("calendarModal");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonth = document.getElementById("calendarMonth");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

let currentDate = new Date();

function openCalendar() {
    calendarModal.style.display = "flex";
    renderCalendar();
}

function closeCalendar() {
    calendarModal.style.display = "none";
}

function renderCalendar() {
    calendarGrid.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarMonth.textContent = currentDate.toLocaleString("ru", {
        month: "long",
        year: "numeric"
    });

    // Всегда 42 ячейки
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement("div");

        if (i < daysInMonth) {
            const day = i + 1;
            cell.className = "calendar-day";
            cell.textContent = day;

            cell.onclick = () => {
                const d = new Date(year, month, day);
                inputDate.value = d.toISOString().split("T")[0];
                closeCalendar();
            };
        } else {
            cell.className = "calendar-day empty-day";
        }

        calendarGrid.appendChild(cell);
    }
}


prevMonthBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
};

nextMonthBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
};

calendarModal.onclick = (e) => {
    if (e.target === calendarModal) closeCalendar();
};

inputDate.onclick = openCalendar;

const warningScreen = document.getElementById("warningScreen");
const warningOk = document.getElementById("warningOk");

// Проверяем флажок посещения
const visitedFlag = localStorage.getItem("visited");
currencySelect.value = currency;
languageSelect.value = language;
dateFormatSelect.value = dateFormat;
themeSelect.value = theme;
settingsScreen.style.display = "none";

function openSettings() {
    settingsScreen.style.display = 'flex';
    settingsScreen.classList.remove('is-hiding');
    requestAnimationFrame(() => settingsScreen.classList.add('is-visible'));
}

settingsOpen.onclick = openSettings;

// Если флажка нет → показываем окно
if (!visitedFlag) {
    warningScreen.style.display = "flex";
} else {
    warningScreen.style.display = "none";
}

// При нажатии на кнопку — скрываем окно и ставим флажок
warningOk.onclick = () => {
    warningScreen.style.display = "none";
    openSettings();
};

settingsConfirm.onclick = () => {
    currency = currencySelect.value;
    language = languageSelect.value;
    dateFormat = dateFormatSelect.value;
    theme = themeSelect.value;
    localStorage.setItem('currency', currency);
    localStorage.setItem('language', language);
    localStorage.setItem('dateFormat', dateFormat);
    localStorage.setItem('theme', theme);
    localStorage.setItem('visited', '1');
    applyLanguage();
    applyTheme();
    render();
    settingsScreen.classList.remove('is-visible');
    settingsScreen.classList.add('is-hiding');

    setTimeout(() => {
        settingsScreen.style.display = 'none';
        settingsScreen.classList.remove('is-hiding');
    }, 300);
};

const appFormInput = document.querySelectorAll('.app-form-input');
const appFormAddBlockMoreBtn = document.getElementById('app-form-add-block-more-btn');
const moreSvg = document.querySelector('.app-form-add-block-more-btn svg');
const moreBlock = document.querySelector('.app-form-add-block');
let isOpen = false; // состояние плашки

btnCancel.addEventListener('click', () => {
    editId = null;
    inputName.value = '';
    inputSum.value = '';
    inputDate.value = '';
    btnAdd.textContent = translations[language].addButton;
    btnCancel.style.display = 'none';
    btnCancel.style.visibility = 'hidden';
    appFormAddBlockTitle.textContent = translations[language].addTitle;

    if (isOpen) moreBlock.click();
});

moreBlock.addEventListener('click', () => {
    if (!isOpen) {
        // Открываем
        moreSvg.style.transform = 'rotate(-180deg)'
        btnAdd.style.display = 'block';
        btnAdd.style.visibility = 'visible';

        appFormInput.forEach(input => {
            input.style.display = 'block';
            input.style.visibility = 'visible';
        });

        appForm.classList.add('is-open');
        isOpen = true;
        appForm.style.height = appForm.scrollHeight + 'px';
    } else {
        // Закрываем
        appForm.classList.remove('is-open');
        appForm.style.height = '50px';
        moreSvg.style.transform = ''
        btnAdd.style.display = '';
        btnAdd.style.visibility = '';

        appFormInput.forEach(input => {
            input.style.display = 'none';
            input.style.visibility = 'hidden';
        });

        isOpen = false;
    }
});

setTimeout(() => {
    loadingScreen.classList.add('is-hidden');
}, 1500);


