document.addEventListener('DOMContentLoaded', () => {
  const adminLink = document.getElementById('admin-link');

  if (adminLink) {
    adminLink.addEventListener('click', async (e) => {
      e.preventDefault();

      const password = prompt('Enter Admin Password:');
      if (!password) return;

      try {
        const response = await fetch('/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = result.redirect;
        } else {
          alert(result.message);
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Something went wrong. Please try again.');
      }
    });
  }
});
