// IndexedDB
let db;                                         // переменная для хранения ссылки на открытую базу данных
const DB_NAME = 'PasswordManagerDB';     // название базы данных
const DB_VERSION = 1;                  // версия базы данных (увеличивается при изменении структуры)
const STORE_NAME = 'passwords';          // название хранилища (таблицы бд)

// открываем / создаём базу данных с указанным именем и версией
const request = indexedDB.open(DB_NAME, DB_VERSION);

// если базы ещё нет или версия изменилась
request.onupgradeneeded = (event) => {
    db = event.target.result;   // получаем объект базы данных

    // проверка, есть ли уже хранилище 'passwords'
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        // создаём хранилище с автоинкрементом id
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
};

// если при открытии произошла ошибка
request.onerror = (event) => {
    console.error('Ошибка IndexedDB:', event.target.error); // вывод ошибки в консоль
};

// если база успешно открыта
request.onsuccess = (event) => {
    db = event.target.result; // сохраняем открытую базу данных в переменную db
    renderPasswords(); // загружаем и отображаем все сохранённые пароли
};

// DOM элементы
const form = document.getElementById('password-form'); // главная форма создания и сохранения паролей
const siteInput = document.getElementById('site'); // поле ввода сайта / url
const loginInput = document.getElementById('login'); // поле ввода логина
const passwordInput = document.getElementById('password'); // поле ввода пароля
const listEl = document.getElementById('password-list'); // контейнер куда будут выводиться сохраненные пароли

const generateBtn = document.getElementById('generate'); // кнопка сгенерировать пароль
const copyBtn = document.getElementById('copyPassword'); // кнопка скопировать пароль с поля ввода
const toggleBtn = document.getElementById('togglePassword'); // кнопка-переключатель показать / скрыть пароль

// генерация пароля (решил сделать как у ios)
generateBtn.addEventListener('click', () => {   // вешаем обработчик на кнопку "Сгенерировать пароль"

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";     // набор допустимых символов для генерации (буквы + цифры)

    const groupLength = 6;  // длина одной группы символов
    const groups = 3;       // количество групп (формат 6-6-6)

    // функция создаёт одну группу из 6 случайных символов
    const generateGroup = () => {
        let res = "";       // результат
        for (let i = 0; i < groupLength; i++) {  // 6 раз выбираем случайный символ
            res += chars[Math.floor(Math.random() * chars.length)];
            // Math.random() -> случайное число с плав.точкой от 0 до 1
            // * chars.length -> масштабируем под длину набора
            // Math.floor -> округляем вниз до целого
            // chars[...] -> берём символ по индексу из набора
        }
        return res; // возвращаем группу из 6 символов
    };

    // создаём массив длиной groups (3 группы), заполняем его generateGroup результатами
    // потом объединяем группы через дефис: "xxxxxx-xxxxxx-xxxxxx"
    const password = Array.from({ length: groups }, generateGroup).join('-');

    passwordInput.value = password; // записываем пароль в поле ввода
});

// функция копирования текста
function copyToClipboard(text) {
    if (!text) return;                               // если текста нет — выходим
    navigator.clipboard.writeText(text)              // пишем текст в буфер обмена
        .then(() => {                                // при успехе
            console.log('Скопировано:', text);       // логируем
        })
        .catch(err => console.error('Ошибка копирования:', err)); // при ошибке логируем её
}

// функция переключения видимости пароля
function togglePasswordVisibility(inputEl, eyeIconEl) {
    if (inputEl.type === 'password') {                // если скрыт
        inputEl.type = 'text';                       // показываем
        eyeIconEl.src = 'icons/eye_off.png';         // меняем иконку
    } else {                                          // если показан
        inputEl.type = 'password';                   // скрываем
        eyeIconEl.src = 'icons/eye.png';             // иконку ставим обратно
    }
}

const eyeIcon = document.getElementById('eyeIcon');   // иконка глаза

// кнопка-переключатель показать / скрыть пароль
toggleBtn.addEventListener('click', () => {
    togglePasswordVisibility(passwordInput, eyeIcon); // меняем видимость пароля
});

// кнопка копировать пароль
copyBtn.addEventListener('click', () => {
    copyToClipboard(passwordInput.value);  // копируем пароль в буфер
});

// сохранение
form.addEventListener('submit', (e) => {   // обработка отправки формы
    e.preventDefault();                             // отменяем перезагрузку страницы

    const data = {                                  // собираем данные записи
        site: siteInput.value,
        login: loginInput.value,
        password: passwordInput.value,
        created: new Date().toLocaleString()        // дата и время создания пароля
    };

    const tx = db.transaction(STORE_NAME, 'readwrite'); // транзакция на запись
    const store = tx.objectStore(STORE_NAME);           // получаем хранилище
    store.add(data);                                     // добавляем запись

    tx.oncomplete = () => {         // когда запись завершена
        form.reset();                       // очищаем форму
        renderPasswords();               // перерисовываем список сохраненных паролей
    };
});

// отрисовка списка с паролями
function renderPasswords() {
    listEl.innerHTML = '';                               // очищаем список перед перерисовкой

    const tx = db.transaction(STORE_NAME, 'readonly');   // транзакция только для чтения
    const store = tx.objectStore(STORE_NAME);            // получаем хранилище

    const rows = [];                                      // массив для временного хранения записей

    store.openCursor().onsuccess = (e) => {               // работаем курсором
        // курсор (в терминах indexedDB) — это итератор, который позволяет поочерёдно (по одной) пройти по всем записям в объектном хранилище (object store), без загрузки всего сразу в память.
        const cursor = e.target.result;
        if (cursor) {                                     // есть очередная запись
            const item = cursor.value;
            rows.push(item);                              // добавляем в массив
            cursor.continue();                            // переходим к следующей
        } else {                                          // курсор закончился (все записи получены)
            rows.forEach(item => {                        // рендерим список
                const row = document.createElement('div');
                row.className = 'password-row';           // CSS-класс строки
                row.dataset.id = item.id;                 // сохраняем id записи
                row.innerHTML = `
                    <strong title="${escapeHtml(item.site)}">${escapeHtml(item.site)}</strong>
                    <span class="login" title="${escapeHtml(item.login)}">${escapeHtml(item.login)}</span>
                `;                                        // короткая запись (сайт + логин)
                listEl.appendChild(row);                  // добавляем строку в список

                // при клике показываем/скрываем полные детали
                row.addEventListener('click', () => {
                    togglePasswordDetail(row, item);
                });
            });
        }
    };
}

// отслеживаем, какие карточки сейчас раскрыты (ключ — id записи, значение — true/false)
const openDetails = {};

// функция раскрытия/сворачивания деталей записи по клику на строку с записью
function togglePasswordDetail(rowEl, item) {
    const id = item.id; // получаем уникальный идентификатор текущей записи

    // проверяем: если карточка с этим id уже открыта — сворачиваем её
    if (openDetails[id]) {
        // ищем DOM элемент, идущий сразу после строки (детальная карточка)
        const detailEl = rowEl.nextElementSibling;
        // если такой элемент существует и это действительно карточка деталей — удаляем её из DOM
        if (detailEl && detailEl.classList.contains('password-detail')) {
            detailEl.remove();
        }
        // обновляем флаг: карточка теперь закрыта
        openDetails[id] = false;
        // карточка свёрнута - выход из функции
        return;
    }

    // закрываем все другие открытые карточки (оставляем только одну открытой)
    // проходим по всем ключам (id) в объекте openDetails
    Object.keys(openDetails).forEach(key => {
        // если ключ не равен текущему id И карточка с этим id открыта
        if (key !== id && openDetails[key]) {
            // находим строку с этим id в DOM
            const existingRow = document.querySelector(`.password-row[data-id="${key}"]`);
            // если строка найдена и за ней идёт элемент-карточка — удаляем эту карточку
            if (existingRow && existingRow.nextElementSibling?.classList.contains('password-detail')) {
                existingRow.nextElementSibling.remove();
            }
            // обновляем флаг: эта карточка теперь закрыта
            openDetails[key] = false;
        }
    });

    // создаём новый элемент для детальной карточки
    const detailEl = document.createElement('div');
    // присваиваем CSS-класс для стилизации
    detailEl.className = 'password-detail';

    // генерируем уникальные ID для input и иконки глаза (на основе id записи)
    const passwordId = `pw-${id}`;
    const eyeId = `eye-${id}`;

    // наполняем карточку HTML-структурой с данными записи
    detailEl.innerHTML = `
        <div class="field">
            <label>Сайт</label>
            <div>${escapeHtml(item.site)}</div> <!-- Защита от XSS -->
            <!-- XSS — это когда злоумышленник внедряет вредоносный JavaScript-код на веб-страницу, и он выполняется у других пользователей. -->
        </div>
        <div class="field">
            <label>Логин</label>
            <div>${escapeHtml(item.login)}</div> <!-- Защита от XSS -->
        </div>
        <div class="field">
            <label>Пароль</label>
            <div class="password-group">
                <!-- поле пароля (по умолчанию скрыто) -->
                <input type="password" id="${passwordId}" value="${escapeHtml(item.password)}" readonly>
                <!-- кнопка "показать/скрыть" -->
                <button type="button" class="icon-btn toggle-btn" data-target="${passwordId}" data-eye="${eyeId}" title="Показать">
                    <img id="${eyeId}" src="icons/eye.png" alt="eye">
                </button>
                <!-- кнопка "скопировать" -->
                <button type="button" class="icon-btn copy-btn" data-password="${escapeHtml(item.password)}" title="Скопировать">
                    <img src="icons/copy.png" alt="copy">
                </button>
            </div>
        </div>
        <!-- дата создания записи -->
        <small>Сохранено: ${escapeHtml(item.created)}</small>

        <div class="actions">
            <!-- кнопка "удалить" -->
            <button type="button" class="icon-btn delete-btn" data-id="${item.id}" title="Удалить">
                <img src="icons/delete.png" alt="delete">
            </button>
        </div>
    `;

    // вставляем карточку сразу после строки-заголовка
    rowEl.insertAdjacentElement('afterend', detailEl);
    // обновляем флаг: карточка с этим id теперь открыта
    openDetails[id] = true;

    // находим кнопки внутри новой карточки
    const toggleBtn = detailEl.querySelector('.toggle-btn');
    const copyBtn = detailEl.querySelector('.copy-btn');
    const deleteBtn = detailEl.querySelector('.delete-btn');

    // навешиваем обработчик на кнопку "показать/скрыть"
    toggleBtn?.addEventListener('click', (e) => {
        // получаем элементы input и иконки по их ID
        const inputEl = document.getElementById(passwordId);
        const eyeIconEl = document.getElementById(eyeId);
        // вызываем функцию переключения видимости пароля
        togglePasswordVisibility(inputEl, eyeIconEl);
    });

    // навешиваем обработчик на кнопку "скопировать"
    copyBtn?.addEventListener('click', () => {
        // вызываем функцию копирования (берём пароль из исходного объекта item)
        copyToClipboard(item.password);
    });

    // навешиваем обработчик на кнопку "удалить"
    deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // останавливает всплытие события по DOM
        // показываем подтверждение удаления
        if (confirm(`Удалить пароль для "${item.site}"?`)) {
            // вызываем функцию удаления записи из IndexedDB
            deletePassword(item.id);
        }
    });
}

// функция для защиты от XSS: преобразует спецсимволы (<, >, &, ") в безопасные HTML-сущности
function escapeHtml(str) {
    // создаём временный DOM-элемент (невидимый, не вставляется в страницу)
    const div = document.createElement('div');
    // присваиваем строку через textContent — браузер автоматически экранирует HTML-символы
    div.textContent = str;
    // возвращаем HTML-представление (уже безопасное: < → &lt;, > → &gt; и т.д.)
    return div.innerHTML;
}

// функция удаления записи из IndexedDB по её уникальному id
function deletePassword(id) {
    // проверяем: открыта ли база данных
    if (!db) {
        console.warn('База ещё не готова'); // лог в консоль (предупреждение)
        return; // прекращаем выполнение
    }

    // создаём транзакцию с правами на запись (readwrite)
    const tx = db.transaction(STORE_NAME, 'readwrite');
    // получаем доступ к хранилищу (object store) с паролями
    const store = tx.objectStore(STORE_NAME);
    // запрашиваем удаление записи с указанным id — возвращает объект запроса
    const request = store.delete(id);

    // обработчик успешного удаления
    request.onsuccess = () => {
        console.log(`Успешно удалено: id=${id}`); // лог
        renderPasswords(); // перерисовываем список паролей
    };

    // обработчик ошибки при удалении (например если запись не найдена или БД закрыта)
    request.onerror = (event) => {
        // логируем ошибку в консоль с деталями
        console.error(`Ошибка удаления id=${id}:`, event.target.error);
        // показываем всплывающее сообщение об ошибке
        alert(`Не удалось удалить запись (${event.target.error})`);
    };
}