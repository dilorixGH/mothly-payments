let db;
let expenses = [];
let editId = null;

const inputName = document.getElementById('inputName');
const inputSum = document.getElementById('inputSum');
const inputDate = document.getElementById('inputDate');
const btnAdd = document.getElementById('btnAdd');
const list = document.getElementById('list');
const totalValue = document.getElementById('totalValue');

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
        alert("Заполните все поля");
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
        loadExpenses();
    };
});

// ---------------------------
// DELETE EXPENSE
// ---------------------------
function deleteExpense(id) {
    const tx = db.transaction("expenses", "readwrite");
    const store = tx.objectStore("expenses");
    store.delete(id);

    tx.oncomplete = () => {
        loadExpenses();
    };
}

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

        const left = document.createElement("div");
        left.className = "app-list-item-left";
        left.innerHTML = `
            <div class="app-list-item-name">${exp.name}</div>
            <div class="app-list-item-date">Оплачено до: ${exp.date}</div>
        `;

        const sum = document.createElement("div");
        sum.className = "app-list-item-sum";
        sum.textContent = exp.sum + " ₽";

        const del = document.createElement("button");
        del.className = "app-list-item-delete";
        del.textContent = "Удалить";
        del.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteExpense(exp.id);
        });

        item.appendChild(left);
        item.appendChild(sum);
        item.appendChild(del);

        item.addEventListener("click", () => {
            inputName.value = exp.name;
            inputSum.value = exp.sum;
            inputDate.value = exp.date;
            editId = exp.id;
        });

        list.appendChild(item);
    });

    totalValue.textContent = total + " €";
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

// Если флажка нет → показываем окно
if (!visitedFlag) {
    warningScreen.style.display = "flex";
} else {
    warningScreen.style.display = "none";
}

// При нажатии на кнопку — скрываем окно и ставим флажок
warningOk.onclick = () => {
    warningScreen.style.display = "none";
    localStorage.setItem("visited", "1");
};

const screens = {
    expenses: document.getElementById("screen-expenses"),
    stats: document.getElementById("screen-stats"),
    settings: document.getElementById("screen-settings")
};

const navItems = document.querySelectorAll(".nav-item");
const slider = document.querySelector(".nav-slider");

function activateScreen(name) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.remove("active");
    });

    screens[name].classList.add("active");

    navItems.forEach(item => item.classList.remove("active"));
    document.querySelector(`[data-screen="${name}"]`).classList.add("active");

    const index = Array.from(navItems).findIndex(i => i.dataset.screen === name);
    slider.style.transform = `translateX(${index * 33.33}vw)`;
}

navItems.forEach(item => {
    item.onclick = () => activateScreen(item.dataset.screen);
});

/* Drag slider */
let dragging = false;

slider.addEventListener("touchstart", () => dragging = true);
slider.addEventListener("touchend", () => dragging = false);

slider.addEventListener("touchmove", (e) => {
    if (!dragging) return;

    const x = e.touches[0].clientX;
    const width = window.innerWidth;

    const index = Math.floor(x / (width / 3));

    if (index === 0) activateScreen("expenses");
    if (index === 1) activateScreen("stats");
    if (index === 2) activateScreen("settings");
});
