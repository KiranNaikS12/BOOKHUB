function validateInput(inputElement, errorMessageElement, validationRegex, minLength, emptyErrorMessage, invalidErrorMessage, consecutiveSameDigitsErrorMessage) {
    let input = document.getElementById(inputElement);
    let error = document.getElementById(errorMessageElement);

    input.addEventListener('blur', function () {
        const inputValue = input.value.trim();

        if (inputValue === '') {
            input.classList.add('invalid');
            error.innerHTML = `<span style="color: red;">${emptyErrorMessage}</span>`;
        } else if (inputValue.length < minLength || !validationRegex.test(inputValue)) {
            input.classList.add('invalid');
            error.innerHTML = `<span style="color: red;">${invalidErrorMessage}</span>`;
        } else if (hasConsecutiveSameDigits(inputValue)) {
            input.classList.add('invalid');
            error.innerHTML = `<span style="color: red;">${consecutiveSameDigitsErrorMessage}</span>`;
        } else {
            error.innerHTML = '';
        }
    });

    input.addEventListener('focus', function () {
        if (input.classList.contains('invalid')) {
            input.classList.remove("invalid");
            error.innerHTML = '';
        }
    });
}

validateInput('firstname', 'firstNameErrorMessage', /^[a-zA-Z]+$/, 1, 'First name should not be empty.', 'First name should only contain letters.');
validateInput('lastname', 'lastnameErrorMessage', /^[a-zA-Z]+$/, 1, 'Lastname should not be empty.', 'Lastname should only contain letters.');
validateInput('username', 'usernameErrorMessage', /^[a-zA-Z0-9_]+$/, 3, 'Username should not be empty.', 'Username should be at least three characters.');
validateInput('emailId', 'emailErrorMessage', /^[^\s@]+@[^\s@]+\.[^\s@]+\S$/, 1, 'Email should not be empty.', 'Enter a valid email address.');
validateInput('mobile', 'phoneErrorMessage', /^\d{10}$/, 10, 'Phone number should not be empty.', 'Enter a valid 10-digit phone number.', 'Phone number should not contain 10 consecutive same digits.');
validateInput('password', 'passwordErrorMessage', /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;<>,.?~\\-])(?=.*[a-zA-Z\d!@#$%^&*()_+={}[\]:;<>,.?~\\-]).{8,}$/, 8, 'Password should not be empty.', 'Enter a valid password.');

function hasConsecutiveSameDigits(str) {
    for (let i = 0; i <= str.length - 10; i++) {
        let substring = str.substring(i, i + 10);
        if (/^(\d)\1{9}$/.test(substring)) {
            return true;
        }
    }
    return false;
}

function validatePasswordConfirmation(passwordElement, confirmationElement, errorMessageElement, emptyErrorMessage, mismatchErrorMessage) {
    let passwordInput = document.getElementById(passwordElement);
    let confirmationInput = document.getElementById(confirmationElement);
    let error = document.getElementById(errorMessageElement);

    confirmationInput.addEventListener('blur', function () {
        const confirmationValue = confirmationInput.value.trim();
        const passwordValue = passwordInput.value.trim();

        if (confirmationValue === '') {
            confirmationInput.classList.add('invalid');
            error.innerHTML = `<span style="color: red;">${emptyErrorMessage}</span>`;
        } else if (confirmationValue !== passwordValue) {
            confirmationInput.classList.add('invalid');
            error.innerHTML = `<span style="color: red;">${mismatchErrorMessage}</span>`;
        } else {
            error.innerHTML = '';
        }
    });

    confirmationInput.addEventListener('focus', function () {
        if (confirmationInput.classList.contains('invalid')) {
            confirmationInput.classList.remove("invalid");
            error.innerHTML = '';
        }
    });
}

validatePasswordConfirmation('password', 'confirm_password', 'confirmPasswordErrorMessage', 'Confirmation password should not be empty.', 'Passwords do not match.');
    
function validateCheckbox(checkboxElement, errorMessageElement, uncheckedErrorMessage) {
        let checkbox = document.getElementById(checkboxElement);
        let error = document.getElementById(errorMessageElement);

        checkbox.addEventListener('change', function () {
            if (!checkbox.checked) {
                error.innerHTML = `<span style="color: red;">${uncheckedErrorMessage}</span>`;
            } else {
                error.innerHTML = '';
            }
        });
    }

validateCheckbox('exampleCheckbox12', 'checkboxErrorMessage', 'Please agree to the terms and conditions.');

document.getElementById('registrationForm').addEventListener('submit', function (event) {
    let checkbox = document.getElementById('exampleCheckbox12');
    let checkboxError = document.getElementById('checkboxErrorMessage');

    if (!checkbox.checked) {
        checkboxError.innerHTML = `<span style="color: red;">Please agree to the terms and conditions.</span>`;
        event.preventDefault();
    }

    $('#otpModal').modal('show');
});