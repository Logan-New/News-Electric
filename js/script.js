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
  let selectedImages = []; // To track selected images for preview and form submission
  let imagesToDelete = [];  // To keep track of images to delete before saving

  const BACKEND_URL = 'https://news-electric.onrender.com';

  const showFeedback = (message, isSuccess = true) => {
    if (feedbackMessage && feedbackSection) {
      feedbackMessage.textContent = message;
      feedbackSection.className = isSuccess ? 'success' : 'error';
      feedbackSection.classList.remove('hidden');
      setTimeout(() => feedbackSection.classList.add('hidden'), 5000);
    }
  };

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

  const rebuildCoverPhotoDropdown = () => {
    coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
    selectedImages.forEach((image, index) => {
      const option = document.createElement('option');
      option.value = image.src || image.name; // Handle both file inputs and URLs
      option.textContent = `Image ${index + 1}`;
      coverPhotoSelect.appendChild(option);
    });
  };

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      const currentCount = selectedImages.length;

      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgContainer = document.createElement('div');
          imgContainer.classList.add('image-preview');

          const imageElement = document.createElement('img');
          imageElement.src = event.target.result;
          imageElement.style.maxWidth = '100px';

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'X';
          deleteButton.classList.add('delete-img');
          deleteButton.addEventListener('click', () => {
            imgContainer.remove();
            selectedImages = selectedImages.filter((img) => img !== file);
            imagesToDelete.push(event.target.result);
            rebuildCoverPhotoDropdown();
          });

          imgContainer.appendChild(imageElement);
          imgContainer.appendChild(deleteButton);
          imagePreviewContainer.appendChild(imgContainer);

          selectedImages.push({ src: event.target.result, name: file.name });
          rebuildCoverPhotoDropdown();
        };

        reader.readAsDataURL(file);
      });
    });
  }

  const populateServiceForm = async (id) => {
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');

    try {
      const data = await fetchData('/api/services', { cache: 'no-store' });
      const service = data.services.find((s) => s.id === id);

      if (service) {
        nameInput.value = service.name || '';
        descriptionInput.value = service.description || '';
        selectedImages = service.images.map((image) => ({ src: image }));

        imagePreviewContainer.innerHTML = service.images
          ? service.images
              .map(
                (image, index) => `
                  <div class="image-preview">
                    <img src="${image}" alt="${service.name}">
                    <label>Image ${index + 1}</label>
                  </div>`
              )
              .join('')
          : '';

        rebuildCoverPhotoDropdown();
      }
    } catch (err) {
      showFeedback('Failed to populate service form.', false);
    }
  };

  if (serviceSelect) {
    serviceSelect.addEventListener('change', (e) => {
      const selectedServiceId = e.target.value;
      if (selectedServiceId) {
        populateServiceForm(selectedServiceId);
      } else {
        form.reset();
        selectedImages = [];
        imagesToDelete = [];
        imagePreviewContainer.innerHTML = '';
        rebuildCoverPhotoDropdown();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const coverPhoto = coverPhotoSelect.value;
      formData.append('coverPhoto', coverPhoto);

      selectedImages.forEach((image) => {
        formData.append('images', image.name || image.src);
      });

      imagesToDelete.forEach((image) => {
        formData.append('imagesToDelete', image);
      });

      const id = serviceSelect.value;
      const method = id ? 'PUT' : 'POST';
      const endpoint = id ? `/api/admin/update-service/${id}` : `/api/admin/add-service`;

      try {
        const result = await fetchData(endpoint, { method, body: formData });
        if (result.success) {
          showFeedback(result.message || 'Service successfully managed!');
          await loadServices();
          form.reset();
          selectedImages = [];
          imagesToDelete = [];
          imagePreviewContainer.innerHTML = '';
          rebuildCoverPhotoDropdown();
        } else {
          showFeedback(result.error || 'Failed to manage service.', false);
        }
      } catch (err) {
        showFeedback('An error occurred while managing the service.', false);
      }
    });
  }

  if (deleteServiceButton) {
    deleteServiceButton.addEventListener('click', async () => {
      const id = serviceSelect.value;
      if (!id) return showFeedback('Please select a service to delete.', false);

      if (confirm('Are you sure you want to delete this service?')) {
        try {
          const result = await fetchData(`/api/admin/delete-service/${id}`, { method: 'DELETE' });
          if (result.success) {
            showFeedback(result.message || 'Service deleted successfully!');
            await loadServices();
          } else {
            showFeedback(result.error || 'Failed to delete service.', false);
          }
        } catch (err) {
          showFeedback('An error occurred while deleting the service.', false);
        }
      }
    });
  }

  if (returnHomeButton) {
    returnHomeButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/';
    });
  }

  await loadServices();
});
