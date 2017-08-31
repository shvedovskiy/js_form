// Отключить стандартную HTML-валидацию для форм класса .validate:
let forms = document.querySelectorAll('.validate');
for (let i = 0, l = forms.length; i < l; i += 1) {
    forms[i].setAttribute('novalidate', true);
}

// Проверить наличие ошибок валидации поля:
let hasError = function (field) {
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
};

// Вывести ошибки валидации поля:
let showError = function (field, error) {
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
};

// Скрыть сообщения об ошибке:
let removeError = function (field) {
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
};

// Активировать валидацию поля, когда юзер уходит с него:
document.addEventListener('blur', function (e) {
    if (!e.target.form.classList.contains('validate')) // валидируем только формы с классом .validate
        return;

    let error = hasError(e.target); // проверить ошибки валидации для поля

    if (error) {
        showError(e.target, error);
        return;
    }

    removeError(e.target);

}, true); // вместо навешивания обработчика на все поля, используем event bubbling

// Проверить все поля при сабмите, при наличии ошибок переместить фокус на первое ошибочное поле:
document.addEventListener('submit', function (e) {
    if (!e.target.classList.contains('validate'))
        return;

    let fields = e.target.elements; // все поля формы

    let error, hasErrors;
    for (let i = 0, l = fields.length; i < l; i += 1) {
        error = hasError(fields[i]); // провалидировать каждое поле
        if (error) {
            showError(fields[i], error); // отобразить ошибки
            if (!hasErrors)
                hasErrors = fields[i]; // нашли первое ошибочное поле
        }
    }
    if (hasErrors) {
        e.preventDefault();
        hasErrors.focus(); // поставить фокус на первое ошибочное поле
    }

    // В остальных случаях форма сабмитится нормально, бизнес-логика...
}, false);