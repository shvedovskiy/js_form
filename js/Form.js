const SELECTORS = {
    validate: '.validate',
    form: '.form',
    feedback: '#feedback',
    error: '.error',
    errorMessage: '.error-message',
    errorFor: '#error-for-'
};
const CLASSES = {
    validate: 'validate',
    error: 'error',
    errorMessage: 'error-message',
    errorFor: 'error-for-',
    success: 'success'
};

class Form {
    constructor(elem) {
        this.form = elem;
        this.id = elem.id;
        this.action = elem.action;
        this.data = {};
        this.feedback = this.form.querySelector(SELECTORS.feedback);

        this.form.addEventListener('submit', e => this.handleSubmit(e));
        // Активировать валидацию поля, когда пользователь уходит с него:
        document.addEventListener('blur', e => this.handleBlur(e), true); // вместо установки обработчика на все поля используем event bubbling
        // Когда пользователь загружает форму или появляется в онлайне, получить сохраненные данные:
        window.addEventListener('online', () => this.checkStorage());
        window.addEventListener('load', () => this.checkStorage());
    }

    // Обработка отправки формы:
    handleSubmit(e) {
        if (!e.target.classList.contains(CLASSES.validate)) {
            // Не валидировать формы без соответствующего класса:
            return;
        }

        e.preventDefault();

        const fields = e.target.elements;

        let error, hasErrors;
        for (let i = 0, l = fields.length; i < l; i += 1) {
            error = this.hasError(fields[i]); // провалидировать каждое поле
            if (error) {
                this.showError(fields[i], error); // отобразить ошибки
                if (!hasErrors) {
                    hasErrors = fields[i]; // найдено первое ошибочное поле
                }
            }
        }
        if (hasErrors) {
            hasErrors.focus(); // поставить фокус на первое ошибочное поле
            return;
        }

        this.getFormData();

        if (!navigator.onLine) {
            // Если пользователь в офлайне, собрать и сохранить данные, уведомив пользователя:
            const stored = this.storeData();
            let msg = '<strong>You appear to be offline right now. </strong>';
            if (stored) {
                msg += 'Your data was saved and will be submitted once you come back online.';
            }
            this.resetFeedback();
            this.feedback.innerHTML= msg;
        } else {
            this.sendData(); // обычные действия по отправке формы
        }
    }

    // Обработка ухода с поля ввода формы:
    handleBlur(e) {
        if (!e.target.form.classList.contains(CLASSES.validate)) {
            // Валидировать только формы с классом .validate:
            return;
        }

        const error = this.hasError(e.target); // проверить ошибки валидации для поля
        if (error) {
            this.showError(e.target, error);
            return;
        }
        this.removeError(e.target); // убрать прошлые ошибки, если ввод теперь валидный
    }

    // Проверка наличия ошибок валидации поля:
    hasError(field) {
        // Не проверять валидность следующих полей:
        if (field.disabled ||
            field.type === 'file' ||
            field.type === 'reset' ||
            field.type === 'submit' ||
            field.type === 'button') {
            return;
        }

        const validity = field.validity;

        if (validity.valid) { // вернуть null если поле валидно
            return;
        }

        // Определение типа ошибки:
        if (validity.valueMissing) {
            return 'Please fill out this field.';
        }

        if (validity.typeMismatch) {
            if (field.type === 'email') {
                return 'Please enter an email address.';
            }
            if (field.type === 'url') {
                return 'Please enter an URL.';
            }
        }

        if (validity.tooShort) {
            return `Please lengthen this text to ${field.getAttribute('minLength')} characters or more. 
            You are currently using ${field.value.length} characters.`;
        }

        if (validity.tooLong) {
            return `Please shorten this text to no more than ${field.getAttribute('maxLength')} characters. 
            You are currently using ${field.value.length} characters.`;
        }

        if (validity.badInput) {
            return 'Please enter a number.';
        }

        if (validity.stepMismatch) {
            return 'Please select a valid value.';
        }

        if (validity.rangeOverflow) {
            return `Please select a value that is no more than ${field.getAttribute('max')}`;
        }

        if (validity.rangeUnderflow) {
            return `Please select a value that is no less than ${field.getAttribute('min')}.`;
        }

        if (validity.patternMismatch) {
            if (field.hasAttribute('title')) {
                return field.getAttribute('title');
            }
            return 'Please match the requested format.';
        }
        return 'The value you entered for this field is invalid.';
    }

    // Вывод ошибок валидации поля:
    showError(field, error) {
        field.classList.add(CLASSES.error);

        // Случай радио-кнопок, когда ошибка должна появляться после группы, а не после одного переключателя:
        if (field.type === 'radio' && field.name) {
            let group = document.getElementsByName(field.name); // получить все радиокнопки с таким же именем (все остальные кнопки в группе)
            if (group.length > 0) {
                for (let i = 0, l = group.length; i < l; i += 1) {
                    if (group[i].form !== field.form) { // проверять поля только текущей формы
                        continue;
                    }
                    group[i].classList.add(CLASSES.error);
                }
                field = group[group.length - 1]; // чтобы положить сообщение об ошибке после последней кнопки группы
            }
        }

        // Получение id или имени поля:
        const id = field.id || field.name;
        if (!id) {
            return;
        }

        // Проверить наличие сообщения ошибок, либо создать новое:
        let msg = field.form.querySelector(`${SELECTORS.errorMessage + SELECTORS.errorFor + id}`);
        if (!msg) {
            msg = document.createElement('div');
            msg.className = CLASSES.errorMessage;
            msg.id = `${CLASSES.errorFor + id}`;

            let label;
            // Если поле является радиокнопкои или чекбоксом, вставить сообщение об ошибке после label:
            if (field.type === 'radio' || field.type === 'checkbox') {
                label = field.form.querySelector(`label[for="${id}"]`) || field.parentNode;
                if (label) {
                    label.parentNode.insertBefore(msg, label.nextSibling);
                }
            }
            // В остальных случаях, вставить соощение об ошибке после поля:
            if (!label) {
                field.parentNode.parentNode.insertBefore(msg, field.parentNode.nextSibling);
            }
        }
        field.setAttribute('aria-describedby', `${CLASSES.errorFor + id}`);

        msg.innerHTML = error;
        msg.style.display = 'block';
        msg.style.visibility = 'visible';
    }

    // Сокрытие сообщения об ошибке:
    removeError(field) {
        field.classList.remove(CLASSES.error);
        field.removeAttribute('aria-describedby');

        // Если поле является радиокнопкой, удалить сообщение об ошибке из всей группы радиокнопок и получить последнюю из нее:
        if (field.type === 'radio' && field.name) {
            let group = document.getElementsByName(field.name);
            if (group.length > 0) {
                for (let i = 0, l = group.length; i < l; i += 1) {
                    if (group[i].form !== field.form) {
                        continue;
                    }
                    group[i].classList.remove(CLASSES.error);
                }
                field = group[group.length - 1]; // для удаления сообщения об ошибке после последнего элемента
            }
        }

        const id = field.id || field.name;
        if (!id) {
            return;
        }

        let msg = field.form.querySelector(`${SELECTORS.errorMessage + SELECTORS.errorFor + id}`);
        if (!msg) {
            return;
        }

        msg.innerHTML = '';
        msg.style.display = 'none';
        msg.style.visibility = 'hidden';
    }

    // Получение сохраненных данных формы:
    checkStorage() {
        if (typeof Storage !== 'undefined') { // поддержка localStorage
            const item = localStorage.getItem(this.id);
            const entry = item && JSON.parse(item); // извлечение данных

            if (entry) {
                // Проверить извлеченные данные на актуальность:
                const now = new Date().getTime();
                const day = 24 * 60 * 60 * 1000;
                if (now - day > entry.time) {
                    localStorage.removeItem(this.id);
                    return;
                }
                this.data = entry.data;
                this.sendData(); // отправить извлеченные данные
            }
        }
    }

    // Сохранение данных формы в офлайне:
    storeData() {
        if (typeof Storage !== 'undefined') { // поддержка localStorage
            const entry = {
                time: new Date().getTime(),
                data: this.data
            };
            localStorage.setItem(this.id, JSON.stringify(entry)); // запаковать данные
            return true;
        }
        return false;
    }

    // Отправка формы:
    sendData() {
        axios.post(this.action, this.data)
            .then((response) => {
                this.handleResponse(response);
            })
            .catch((error) => {
                console.warn(error);
            });
    }

    // Функция обратного вызова после ответа сервера на отправку формы:
    handleResponse(response) {
        this.resetFeedback();

        if (response.status === 200) {
            localStorage.removeItem(this.id); // данные отправлены, сохранение не требуется
            this.form.reset();
            this.feedback.classList.add(CLASSES.success);
            this.feedback.textContent = '👍 Successfully sent. Thank you!';
        } else {
            this.feedback.textContent = '🔥 Invalid form submission. Oh noez!';
        }
    }

    // Сборка данных формы:
    getFormData() {
        let field;
        const data = {};

        if (typeof this.form === 'object' && this.form.nodeName === 'FORM') {
            for (let i = 0, l = this.form.elements.length; i < l; i += 1) {
                field = this.form.elements[i];
                if (field.name &&
                    !field.disabled &&
                    field.type !== 'file' &&
                    field.type !== 'reset' &&
                    field.type !== 'submit'
                ) {
                    data[field.name] = field.value || '';
                }
            }
        }
        this.data = data;
    }

    // Очистка информации о статусе отправки формы:
    resetFeedback() {
        this.feedback.classList.remove(CLASSES.success);
        this.feedback.innerHTML = '';
    }
}

// Отключить стандартную HTML-валидацию для форм класса .validate:
Array.from(document.querySelectorAll(SELECTORS.validate)).forEach(form => {
    form.setAttribute('novalidate', 'true');
});

// Создать инстансы класса Form для форм класса .form
Array.from(document.querySelectorAll(SELECTORS.form)).forEach(form => {
    new Form(form);
});
