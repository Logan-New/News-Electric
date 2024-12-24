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
  let galleryImages = []; // To keep track of images for the gallery display

  // Backend URL pointing to your Render app
  const BACKEND_URL = 'https://news-electric.onrender.com'; // Ensure this is the correct backend URL for your deployed app

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
      const response = await fetch(`${BACKEND_URL}${url}`, options); // Fetching from the Render app URL
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Fetch error:', err);
      showFeedback('Failed to fetch data, please try again later.', false);
    }
  };

  // Admin authentication
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
          // Clicking a service loads its details and shows all images
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

            // Handle "Back to Services" button click
            const backToServicesBtn = document.getElementById('back-to-services-btn');
            backToServicesBtn.addEventListener('click', () => {
              window.location.href = '/services'; // Navigate to the services page
            });
          });
          servicesContainer.appendChild(serviceItem);
        }

        // Populate service selection dropdown
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
    const coverPhotoSelect = document.getElementById('cover-photo');

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

        // Prepopulate the cover photo dropdown
        coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
        service.images.forEach((image, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = `Image ${index + 1}`;
          coverPhotoSelect.appendChild(option);
        });

        // Handle deleting the image
        document.querySelectorAll('.delete-img').forEach((button) => {
          button.addEventListener('click', async (e) => {
            const imageElement = e.target.closest('.image-preview');
            const imageUrl = imageElement.querySelector('img').src;
            imageElement.remove();
            imagesToDelete.push(imageUrl); // Add to delete list
          });
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
        document.getElementById('image-preview-container').innerHTML = '';
        coverPhotoSelect.innerHTML = '<option value="">Select a cover photo</option>';
      }
    });
  }

  // Handle form submission for adding/updating service
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
        const result = await fetchData(endpoint, { method, body: formData });
        if (result.success) {
          showFeedback(result.message || 'Service successfully managed!');
          await loadServices();
          form.reset();
          document.getElementById('image-preview-container').innerHTML = '';
        } else {
          showFeedback(result.error || 'Failed to manage service.', false);
        }
      } catch (err) {
        showFeedback('An error occurred while managing the service.', false);
      }
    });
  }

  // Delete selected service
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

  // Return to homepage
  if (returnHomeButton) {
    returnHomeButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/';
    });
  }

  await loadServices(); // Initially load all services when the page loads
});
