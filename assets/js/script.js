document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.getElementById("password-toggle");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");
  const loginCard = document.querySelector(".login-card");
  const createAccountLink = document.getElementById("create-account");

  // Valid credentials (for demo purposes only)
  const validUsername = "admin";
  const validPassword = "password123";

  // Password visibility toggle
  passwordToggle.addEventListener("click", function () {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      passwordToggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      passwordInput.type = "password";
      passwordToggle.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });

  // Form validation and submission
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    // Simple validation
    if (!username || !password) {
      showError("Please enter both username and password");
      return;
    }

    // Check credentials (in a real app, this would be a server-side check)
    if (username === validUsername && password === validPassword) {
      // Successful login
      errorMessage.style.display = "none";
      successMessage.style.display = "block";

      // Redirect after successful login
      setTimeout(() => {
        window.location.href = "parking.html";
      }, 1500);
    } else {
      // Failed login
      showError("Invalid username or password. Try: admin / password123");
      loginCard.classList.add("shake");
      setTimeout(() => {
        loginCard.classList.remove("shake");
      }, 500);
    }
  });

  // Create account link functionality
  createAccountLink.addEventListener("click", function (e) {
    e.preventDefault();

    // Show registration form/modal
    alert(
      "Redirecting to registration page...\n\nIn a real application, this would open a registration form or redirect to a signup page."
    );
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    successMessage.style.display = "none";

    // Hide error after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 5000);
  }

  // Create background effect (simple CSS particles simulation)
  const backgroundEffect = document.querySelector(".background-effect");
  for (let i = 0; i < 25; i++) {
    const particle = document.createElement("div");
    particle.style.position = "absolute";
    particle.style.width = Math.random() * 5 + 2 + "px";
    particle.style.height = particle.style.width;
    particle.style.background = "rgba(255, 255, 255, 0.3)";
    particle.style.borderRadius = "50%";
    particle.style.top = Math.random() * 100 + "%";
    particle.style.left = Math.random() * 100 + "%";
    particle.style.animation = `float ${
      Math.random() * 10 + 10
    }s infinite ease-in-out`;
    particle.style.animationDelay = Math.random() * 5 + "s";
    backgroundEffect.appendChild(particle);
  }

  // Add keyframes for floating animation
  const style = document.createElement("style");
  style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(${Math.random() * 50 - 25}px, ${
    Math.random() * 50 - 25
  }px); }
                    50% { transform: translate(${Math.random() * 50 - 25}px, ${
    Math.random() * 50 - 25
  }px); }
                    75% { transform: translate(${Math.random() * 50 - 25}px, ${
    Math.random() * 50 - 25
  }px); }
                }
            `;
  document.head.appendChild(style);
});
