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
  let selectedImages = [];
  let imagesToDelete = [];
  let galleryImages = [];

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

  if (adminLink) {
    adminLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const password = prompt('Enter Admin Password:');
      if (!password) return alert('Password is required.');
      try {
        const result = await fetchData('/api/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (result.success) {
          window.location.href = '/upload';
        } else {
          alert(result.message || 'Access denied.');
        }
      } catch (err) {
        showFeedback('Authentication failed.', false);
      }
    });
  }

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
          serviceItem.addEventListener('click', () => {
            const imagesHTML = service.images
              .map((image) => `
                <div class="image-preview">
                  <img src="${image}" alt="${service.name}" style="max-width: 100%; margin: 5px;">
                </div>`)
              .join('');
            servicesContainer.innerHTML = `
              <h3>${service.name}</h3>
              <p>${service.description}</p>
              <div>${imagesHTML}</div>
              <button id="back-to-services-btn">Back to Services</button>
            `;

            const backToServicesBtn = document.getElementById('back-to-services-btn');
            backToServicesBtn.addEventListener('click', () => {
              window.location.href = '/services';
            });
          });
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
      if (servicesContainer) {
        servicesContainer.innerHTML = '<p>Failed to load services. Try again later.</p>';
      }
    }
  };

  const populateServiceForm = async (id) => {
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');

    try {
      const data = await fetchData('/api/services', { cache: 'no-store' });
      const service = data.services.find((s) => s.id === id);

      if (service) {
        nameInput.value = service.name || '';
        descriptionInput.value = service.description || '';
        imagePreviewContainer.innerHTML = service.images
          ? service.images
              .map(
                (image, index) => `
                  <div class="image-preview" data-index="${index}" data-src="${image}">
                    <img src="${image}" alt="${service.name}">
                    <button class="delete-img">X</button>
                    <label>Image ${index + 1}</label>
                  </div>`)
              .join('')
          : '';

        coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
        service.images.forEach((image, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = `Image ${index + 1}`;
          coverPhotoSelect.appendChild(option);
        });

        document.querySelectorAll('.delete-img').forEach((button) => {
          button.addEventListener('click', async (e) => {
            const imageElement = e.target.closest('.image-preview');
            const imageUrl = imageElement.querySelector('img').src;
            imageElement.remove();
            imagesToDelete.push(imageUrl);
          });
        });
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
        document.getElementById('image-preview-container').innerHTML = '';
        coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
      }
    });
  }

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const files = e.target.files;
      imagePreviewContainer.innerHTML = '';
      Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (event) {
          const imgContainer = document.createElement('div');
          imgContainer.classList.add('image-preview');
          imgContainer.innerHTML = `
            <img src="${event.target.result}" alt="Preview" style="max-width: 100px; margin-right: 10px;">
            <button class="delete-img">X</button>
          `;
          imagePreviewContainer.appendChild(imgContainer);
          imgContainer.querySelector('.delete-img').addEventListener('click', () => {
            imgContainer.remove();
            selectedImages = selectedImages.filter((img) => img !== file);
          });
        };
        reader.readAsDataURL(file);
      });
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const coverPhotoIndex = coverPhotoSelect.value;
      formData.append('cover-photo', coverPhotoIndex);

      const id = serviceSelect.value;
      const method = id ? 'PUT' : 'POST';
      const endpoint = id ? `/api/admin/update-service/${id}` : `/api/admin/add-service`;

      try {
        const result = await fetch(`${BACKEND_URL}${endpoint}`, {
          method,
          body: formData,
        });
        const data = await result.json();
        if (data.success) {
          showFeedback(data.message || 'Service successfully managed!');
          await loadServices();
          form.reset();
          imagePreviewContainer.innerHTML = '';
          imagesToDelete = [];
        } else {
          showFeedback(data.error || 'Failed to manage service.', false);
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
          const result = await fetch(`${BACKEND_URL}/api/admin/delete-service/${id}`, { method: 'DELETE' });
          const data = await result.json();
          if (data.success) {
            showFeedback(data.message || 'Service deleted successfully!');
            await loadServices();
          } else {
            showFeedback(data.error || 'Failed to delete service.', false);
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
