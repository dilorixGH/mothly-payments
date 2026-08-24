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
    
    if (window?.navigator?.hapticFeedback) {
        navigator.hapticFeedback.impact('medium');
    }

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
