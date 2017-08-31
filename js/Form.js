const SELECTORS = {
    validate: '.validate',
    form: '.form',
    feedbackArea: '.form__feedback'
};

class Form {
    constructor(elem) {
        this.form = elem;
        this.id = elem.id;
        this.action = elem.action;
        this.data = {};
        this.feedbackArea = this.form.querySelector(SELECTORS.feedbackArea);

        this.form.addEventListener('submit', e => {
            e.preventDefault();

            if (!e.target.classList.contains('validate'))
                return;

            let fields = e.target.elements; // все поля формы

            let error, hasErrors;
            for (let i = 0, l = fields.length; i < l; i += 1) {
                error = this.hasError(fields[i]); // провалидировать каждое поле
                if (error) {
                    this.showError(fields[i], error); // отобразить ошибки
                    if (!hasErrors)
                        hasErrors = fields[i]; // нашли первое ошибочное поле
                }
            }
            if (hasErrors) {
                hasErrors.focus(); // поставить фокус на первое ошибочное поле
            } else {
                this.handleSubmit(e);
            }
        });
        window.addEventListener('online', () => this.checkStorage());
        window.addEventListener('load', () => this.checkStorage());
        // Активировать валидацию поля, когда юзер уходит с него:
        document.addEventListener('blur', e => {
            if (!e.target.form.classList.contains('validate')) // валидируем только формы с классом .validate
                return;

            let error = this.hasError(e.target); // проверить ошибки валидации для поля

            if (error) {
                this.showError(e.target, error);
                return;
            }

            this.removeError(e.target);

        }, true); // вместо навешивания обработчика на все поля, используем event bubbling
    }

    handleSubmit(e) {
        this.getFormData();

        if (!navigator.onLine) {
            const stored = this.storeData();
            let msg = '<strong>You appear to be offline right now. </strong>';
            if (stored) {
                msg += 'Your data was saved and will be submitted once you come back online.';
            }
            this.resetFeedback();
            this.feedbackArea.innerHTML= msg;
        } else {
            this.sendData();
        }
    }

    storeData() {
        if (typeof Storage !== 'undefined') {
            const entry = {
                time: new Date().getTime(),
                data: this.data
            };
            localStorage.setItem(this.id, JSON.stringify(entry));
            return true;
        }
        return false;
    }

    sendData() {
        axios.post(this.action, this.data)
            .then((response) => {
                this.handleResponse(response);
            })
            .catch((error) => {
                console.warn(error);
            });
    }

    handleResponse(response) {
        this.resetFeedback();

        if (response.status === 200) {
            localStorage.removeItem(this.id);
            this.form.reset();
            this.feedbackArea.classList.add('success');
            this.feedbackArea.textContent = '👍 Successfully sent. Thank you!';
        } else {
            this.feedbackArea.textContent = '🔥 Invalid form submission. Oh noez!';
        }
    }

    checkStorage() {
        if (typeof Storage !== 'undefined') {
            const item = localStorage.getItem(this.id);
            const entry = item && JSON.parse(item);

            if (entry) {
                const now = new Date().getTime();
                const day = 24 * 60 * 60 * 1000;
                if (now - day > entry.time) {
                    localStorage.removeItem(this.id);
                    return;
                }
                this.data = entry.data;
                this.sendData();
            }
        }
    }

    getFormData() {
        let field;
        let i;
        const data = {};

        if (typeof this.form === 'object' && this.form.nodeName === 'FORM') {
            const len = this.form.elements.length;
            for (i = 0; i < len; i += 1) {
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

    resetFeedback() {
        this.feedbackArea.classList.remove('success');
        this.feedbackArea.innerHTML = '';
    }

    // Проверить наличие ошибок валидации поля:
    hasError(field) {
        // Не проверять валидность следующих полей:
        if (field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button')
            return;

        let validity = field.validity;

        if (validity.valid) // возвращаем null если поле валидно
            return;

        // Определяем тип ошибки:
        if (validity.valueMissing)
            return 'Please fill out this field.';

        if (validity.typeMismatch) {
            if (field.type === 'email')
                return 'Please enter an email address.';

            if (field.type === 'url')
                return 'Please enter an URL.';
        }

        if (validity.tooShort)
            return 'Please lengthen this text to ' + field.getAttribute('minLength') + ' characters or more. You are currently using ' + field.value.length + ' characters.';

        if (validity.tooLong)
            return 'Please shorten this text to no more than ' + field.getAttribute('maxLength') + ' characters. You are currently using ' + field.value.length + ' characters.';

        if (validity.badInput)
            return 'Please enter a number.';

        if (validity.stepMismatch)
            return 'Please select a valid value.';

        if (validity.rangeOverflow)
            return 'Please select a value that is no more than ' + field.getAttribute('max') + '.';

        if (validity.rangeUnderflow)
            return 'Please select a value that is no less than ' + field.getAttribute('min') + '.';

        if (validity.patternMismatch) {
            if (field.hasAttribute('title'))
                return field.getAttribute('title');

            return 'Please match the requested format.';
        }

        return 'The value you entered for this field is invalid.';
    }

    // Вывести ошибки валидации поля:
    showError(field, error) {
        field.classList.add('error');

        // Случай радио-кнопок, когда ошибка должна появляться после группы, а не после одного переключателя:
        if (field.type === 'radio' && field.name) {
            let group = document.getElementsByName(field.name); // получить все радиокнопки с таким же именем (все остальные кнопки в группе)
            if (group.length > 0) {
                for (let i = 0, l = group.length; i < l; i += 1) {
                    if (group[i].form !== field.form) // проверять поля только текущей формы
                        continue;
                    group[i].classList.add('error');
                }
                field = group[group.length - 1]; // чтобы положить сообщение об ошибке после последней кнопки группы
            }
        }

        // Получим id или имя поля:
        let id = field.id || field.name;
        if (!id)
            return;

        // Проверим наличие сообщения ошибок, либо создадим новое:
        let msg = field.form.querySelector('.error-message#error-for-' + id + '');
        if (!msg) {
            msg = document.createElement('div');
            msg.className = 'error-message';
            msg.id = 'error-for-' + id;

            let label;
            // Если поле является радиокнопкои или чекбоксом, вставить сообщение об ошибке после label:
            if (field.type === 'radio' || field.type === 'checkbox') {
                label = field.form.querySelector('label[for="' + id + '"]') || field.parentNode;
                if (label)
                    label.parentNode.insertBefore(msg, label.nextSibling);
            }
            // В остальных случаях, вставить соощение об ошибке после поля:
            if (!label)
                field.parentNode.insertBefore(msg, field.nextSibling);
        }

        field.setAttribute('aria-describedby', 'error-for-' + id);

        msg.innerHTML = error;
        msg.style.display = 'block';
        msg.style.visibility = 'visible';
    }

    // Скрыть сообщения об ошибке:
    removeError(field) {
        field.classList.remove('error');
        field.removeAttribute('aria-describedby');

        // Если поле является радиокнопкой, удалить сообщение об ошибке из всей группы радиокнопок и получить последнюю из нее:
        if (field.type === 'radio' && field.name) {
            let group = document.getElementsByName(field.name);
            if (group.length > 0) {
                for (let i = 0, l = group.length; i < l; i += 1) {
                    if (group[i].form !== field.form)
                        continue;
                    group[i].classList.remove('error');
                }
                field = group[group.length - 1]; // чтобы удалять сообщение об ошибке после последнего элемента
            }
        }

        let id = field.id || field.name;
        if (!id)
            return;

        let msg = field.form.querySelector('.error-message#error-for-' + id + '');
        if (!msg)
            return;

        msg.innerHTML = '';
        msg.style.display = 'none';
        msg.style.visibility = 'hidden';
    }
}

Array.from(document.querySelectorAll(SELECTORS.form)).forEach(form => {
    new Form(form);
});

Array.from(document.querySelectorAll(SELECTORS.validate)).forEach(form => {
   form.setAttribute('novalidate', 'true');
});