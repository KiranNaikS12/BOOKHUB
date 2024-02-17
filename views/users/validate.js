function validateInput(
  inputElement,
  errorMessageElement,
  validationRegex,
  minLength,
  emptyErrorMessage,
  invalidErrorMessage
) {
  let input = document.getElementById(inputElement);
  let error = document.getElementById(errorMessageElement);

  input.onblur = function () {
    const inputValue = input.value.trim();

    if (inputValue === "") {
      input.classList.add("invalid");
      error.innerHTML = `<span style="color: red;">${emptyErrorMessage}</span>`;
    } else if (
      inputValue.length < minLength ||
      !validationRegex.test(inputValue)
    ) {
      input.classList.add("invalid");
      error.innerHTML = `<span style="color: red;">${invalidErrorMessage}</span>`;
    } else {
      error.innerHTML = "";
    }
  };

  input.onfocus = function () {
    if (this.classList.contains("invalid")) {
      this.classList.remove("invalid");
      error.innerHTML = "";
    }
  };
}

function validateConfirmPassword() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm_password").value;
  const error = document.getElementById("confirmPasswordErrorMessage");

  if (password !== confirmPassword) {
    error.innerHTML = `<span style="color: red;">Passwords do not match.</span>`;
    return false;
  } else {
    error.innerHTML = "";
    return true;
  }
}
function validateForm() {
  const isValidFirstName = validateInput(
    "firstname",
    "firstNameErrorMessage",
    /^[a-zA-Z]+$/,
    1,
    "First name should not be empty.",
    "First name should only contain letters."
  );
  const isValidLastName = validateInput(
    "lastname",
    "lastnameErrorMessage",
    /^[a-zA-Z0-9_]+$/,
    1,
    "Lastname should not be empty.",
    "Lastname should only contain letters."
  );
  const isValidUsername = validateInput(
    "username",
    "usernameErrorMessage",
    /^[a-zA-Z0-9_]+$/,
    3,
    "Username should not be empty.",
    "Username should be at least three characters."
  );
  const isValidEmail = validateInput(
    "emailId",
    "emailErrorMessage",
    /^[^\s@]+@[^\s@]+\.[^\s@]+\S$/,
    1,
    "Email should not be empty.",
    "Enter a valid email address."
  );
  const isValidMobile = validateInput(
    "mobile",
    "phoneErrorMessage",
    /^\d{10}$/,
    10,
    "Phone number should not be empty.",
    "Enter a valid 10-digit phone number."
  );
  const isValidPassword = validateInput(
    "password",
    "passwordErrorMessage",
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z0-9!@#$%^&*(),.?":{}|<>]{8,}$/,
    8,
    "Password should not be empty.",
    "Enter a valid password."
  );
  const isValidConfirmPassword = validateConfirmPassword();

  return (
    isValidFirstName &&
    isValidLastName &&
    isValidUsername &&
    isValidEmail &&
    isValidMobile &&
    isValidPassword &&
    isValidConfirmPassword
  );
}
