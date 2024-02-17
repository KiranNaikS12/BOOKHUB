function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleButton = document.getElementById("togglePassword");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleButton.textContent = "visibility_off";
  } else {
    passwordInput.type = "password";
    toggleButton.textContent = "visibility";
  }
}
