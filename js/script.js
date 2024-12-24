document.addEventListener('DOMContentLoaded', async () => {
  const adminLink = document.getElementById('admin-link');
  const feedbackSection = document.getElementById('feedback');
  const feedbackMessage = document.getElementById('feedback-message');
  const servicesContainer = document.getElementById('services-container');
  const serviceSelect = document.getElementById('service-id');
  const form = document.getElementById('manage-service-form');
  const deleteServiceButton = document.getElementById('delete-service');
  const returnHomeButton = document.getElementById('return-home');
  const imageInput = document.getElementById('images');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const coverPhotoSelect = document.getElementById('cover-photo');
  let imagesToDelete = []; // To keep track of images to delete before saving

  // Backend URL pointing to your Render app
  const BACKEND_URL = 'https://news-electric.onrender.com';

  // Show feedback messages
  const showFeedback = (message, isSuccess = true) => {
    if (feedbackMessage && feedbackSection) {
      feedbackMessage.textContent = message;
      feedbackSection.className = isSuccess ? 'success' : 'error';
      feedbackSection.classList.remove('hidden');
      setTimeout(() => feedbackSection.classList.add('hidden'), 5000);
    }
  };

  // Fetch data from API
  const fetchData = async (url, options = {}) => {
    try {
      const response = await fetch(`${BACKEND_URL}${url}`, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Fetch error:', err);
      showFeedback('Failed to fetch data, please try again later.', false);
    }
  };

  // Load services for selection and display
  const loadServices = async () => {
    try {
      const data = await fetchData('/api/services', { cache: 'no-store' });

      if (servicesContainer) servicesContainer.innerHTML = '';
      if (serviceSelect) serviceSelect.innerHTML = '<option value="">Add New Service</option>';

      data.services.forEach((service) => {
        if (servicesContainer) {
          const serviceItem = document.createElement('div');
          serviceItem.classList.add('service-item');
          serviceItem.innerHTML = `
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            ${
              service.images?.length
                ? `<img src="${service.images[0]}" alt="${service.name}" style="max-width: 100%; height: auto;">`
                : '<p>No image available</p>'
            }
          `;
          servicesContainer.appendChild(serviceItem);
        }

        if (serviceSelect) {
          const option = document.createElement('option');
          option.value = service.id;
          option.textContent = service.name;
          serviceSelect.appendChild(option);
        }
      });
    } catch (err) {
      showFeedback('Failed to load services. Try again later.', false);
    }
  };

  // Update image previews and cover photo options
  const updateImagePreviews = (files) => {
    imagePreviewContainer.innerHTML = '';
    coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.src = reader.result;

        const preview = document.createElement('div');
        preview.classList.add('image-preview');

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.addEventListener('click', () => {
          preview.remove();
          updateImagePreviews(imageInput.files); // Refresh previews
        });

        preview.appendChild(img);
        preview.appendChild(deleteButton);
        imagePreviewContainer.appendChild(preview);

        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Image ${index + 1}`;
        coverPhotoSelect.appendChild(option);
      };
      reader.readAsDataURL(file);
    });
  };

  // Populate service form
  const populateServiceForm = async (id) => {
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');

    try {
      const data = await fetchData('/api/services', { cache: 'no-store' });
      const service = data.services.find((s) => s.id === id);

      if (service) {
        nameInput.value = service.name || '';
        descriptionInput.value = service.description || '';

        const files = service.images.map((url) => {
          const blob = new Blob([url]);
          return new File([blob], url.split('/').pop(), { type: 'image/jpeg' });
        });

        updateImagePreviews(files);

        coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
        service.images.forEach((image, index) => {
          const option = document.createElement('option');
          option.value = image;
          option.textContent = `Image ${index + 1}`;
          coverPhotoSelect.appendChild(option);
        });
      }
    } catch (err) {
      showFeedback('Failed to populate service form.', false);
    }
  };

  // Handle form population and reset when service is selected
  if (serviceSelect) {
    serviceSelect.addEventListener('change', (e) => {
      const selectedServiceId = e.target.value;
      if (selectedServiceId) {
        populateServiceForm(selectedServiceId);
      } else {
        form.reset();
        imagePreviewContainer.innerHTML = '';
        coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
      }
    });
  }

  // Handle image input changes
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      updateImagePreviews(e.target.files);
    });
  }

  // Handle form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const id = serviceSelect.value;
      const endpoint = id ? `/api/admin/update-service/${id}` : `/api/admin/add-service`;
      const method = id ? 'PUT' : 'POST';

      try {
        const response = await fetchData(endpoint, {
          method,
          body: formData,
        });

        if (response.success) {
          showFeedback(response.message || 'Service successfully managed!');
          await loadServices();
          form.reset();
          imagePreviewContainer.innerHTML = '';
        } else {
          showFeedback(response.error || 'Failed to manage service.', false);
        }
      } catch (err) {
        showFeedback('An error occurred while managing the service.', false);
      }
    });
  }

  // Handle delete service
  if (deleteServiceButton) {
    deleteServiceButton.addEventListener('click', async () => {
      const id = serviceSelect.value;
      if (!id) return showFeedback('Please select a service to delete.', false);

      if (confirm('Are you sure you want to delete this service?')) {
        try {
          const response = await fetchData(`/api/admin/delete-service/${id}`, { method: 'DELETE' });
          if (response.success) {
            showFeedback(response.message || 'Service deleted successfully!');
            await loadServices();
          } else {
            showFeedback(response.error || 'Failed to delete service.', false);
          }
        } catch (err) {
          showFeedback('An error occurred while deleting the service.', false);
        }
      }
    });
  }

  // Return to homepage
  if (returnHomeButton) {
    returnHomeButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/';
    });
  }

  await loadServices();
});
