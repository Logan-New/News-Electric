document.addEventListener('DOMContentLoaded', async () => {
  const servicesContainer = document.getElementById('services-container');

  try {
    const response = await fetch('/data/services.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    if (data.services.length === 0) {
      servicesContainer.innerHTML = '<p>No services available at the moment. Please check back later.</p>';
      return;
    }

    // Render services dynamically
    data.services.forEach((service) => {
      const serviceCard = document.createElement('div');
      serviceCard.className = 'service-card';
      serviceCard.innerHTML = `
        <h3>${service.name}</h3>
        <p>${service.description}</p>
        ${service.image ? `<img src="${service.image}" alt="${service.name}" />` : ''}
      `;
      servicesContainer.appendChild(serviceCard);
    });
  } catch (err) {
    console.error('Failed to load services:', err);
    servicesContainer.innerHTML = '<p>Failed to load services. Please try again later.</p>';
  }
});
