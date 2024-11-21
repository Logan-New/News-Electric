document.addEventListener('DOMContentLoaded', async () => {
  // Admin Link Authentication
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.addEventListener('click', async (e) => {
      e.preventDefault();

      const password = prompt('Enter Admin Password:');
      if (!password) {
        alert('Password is required.');
        return;
      }

      try {
        const response = await fetch('/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          window.location.href = '/admin/upload.html';
        } else {
          alert(result.message || 'Access denied. Incorrect password.');
        }
      } catch (err) {
        console.error('Error during admin authentication:', err);
        alert('An error occurred while authenticating.');
      }
    });
  }

  // Return to Homepage Functionality
  const returnHomeButton = document.getElementById('return-home');
  if (returnHomeButton) {
    returnHomeButton.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  // Service Management for Upload Page
  const form = document.getElementById('manage-service-form');
  const feedbackSection = document.getElementById('feedback');
  const feedbackMessage = document.getElementById('feedback-message');
  const deleteServiceButton = document.getElementById('delete-service');
  const imageInput = document.getElementById('image');
  const imagePreview = document.getElementById('image-preview');

  function showFeedback(message, isSuccess = true) {
    if (feedbackSection && feedbackMessage) {
      feedbackMessage.textContent = message;
      feedbackSection.className = isSuccess ? 'success' : 'error';
      feedbackSection.classList.remove('hidden');

      // Hide feedback after 5 seconds
      setTimeout(() => {
        feedbackSection.classList.add('hidden');
      }, 5000);
    }
  }

  async function loadServices() {
    try {
      const response = await fetch('/data/services.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const serviceSelect = document.getElementById('service-id');
      if (!serviceSelect) return;

      serviceSelect.innerHTML = '<option value="">Add New Service</option>';

      data.services.forEach((service) => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        serviceSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to load services:', err);
      showFeedback('Failed to load services. Please try again later.', false);
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('service-id').value;
      const name = document.getElementById('name').value;
      const description = document.getElementById('description').value;

      const file = imageInput.files[0];
      const image = file ? URL.createObjectURL(file) : undefined;

      const endpoint = id ? `/admin/update-service/${id}` : `/admin/add-service`;
      const method = id ? 'PUT' : 'POST';

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, image }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showFeedback(result.message || 'Service successfully managed!');
          await loadServices();
          form.reset();
          imagePreview.innerHTML = '';
        } else {
          showFeedback(result.error || 'Failed to manage service.', false);
        }
      } catch (err) {
        console.error('Error:', err);
        showFeedback('An error occurred while managing the service.', false);
      }
    });

    loadServices();
  }

  // Image Preview Functionality
  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.innerHTML = `<img src="${e.target.result}" alt="Selected Image" style="max-width: 100%; height: auto;" />`;
        };
        reader.readAsDataURL(file);
      } else {
        imagePreview.innerHTML = '';
      }
    });
  }

  // Delete Service Functionality
  if (deleteServiceButton) {
    deleteServiceButton.addEventListener('click', async () => {
      const id = document.getElementById('service-id').value;
      if (!id) {
        showFeedback('Please select a service to delete.', false);
        return;
      }

      if (!confirm('Are you sure you want to delete this service?')) {
        return;
      }

      try {
        const response = await fetch(`/admin/delete-service/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok && result.success) {
          showFeedback(result.message || 'Service deleted successfully!');
          await loadServices();
          form.reset();
          imagePreview.innerHTML = '';
        } else {
          showFeedback(result.error || 'Failed to delete service.', false);
        }
      } catch (err) {
        console.error('Error:', err);
        showFeedback('An error occurred while deleting the service.', false);
      }
    });
  }
});
