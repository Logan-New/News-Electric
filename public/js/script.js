document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('manage-service-form');

  async function loadServices() {
    try {
      const response = await fetch('/data/services.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const serviceSelect = document.getElementById('service-id');
      if (!serviceSelect) return;

      // Clear the dropdown options
      serviceSelect.innerHTML = '<option value="">Add New Service</option>';

      // Populate the dropdown with updated services
      data.services.forEach((service) => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        serviceSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to load services:', err);
      alert('Failed to load services. Please try again later.');
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('service-id').value;
      const name = document.getElementById('name').value;
      const description = document.getElementById('description').value;
      const image = document.getElementById('image').value || undefined;

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
          alert(result.message || 'Service successfully managed!');
          await loadServices(); // Dynamically reload services
          form.reset(); // Clear the form fields
        } else {
          alert(result.error || 'Failed to manage service.');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('An error occurred while managing the service.');
      }
    });

    loadServices(); // Load services when the page loads
  }
});
