document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = '/dashboard.html';
      } else {
        errorMsg.textContent = 'Incorrect password';
        errorMsg.style.display = 'block';
      }
    } catch (err) {
      errorMsg.textContent = 'An error occurred during login';
      errorMsg.style.display = 'block';
    }
  });
});
