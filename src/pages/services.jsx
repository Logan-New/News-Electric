import React from 'react';
import ServiceCard from '../components/serviceCard';

const Services = () => {
  const services = [
    { title: 'Residential Wiring', description: 'Safe and efficient electrical installations for homes.' }
  ];

  return (
    <main>
      <h2>Our Services</h2>
      <div className="services-list">
        {services.map((service, index) => (
          <ServiceCard key={index} title={service.title} description={service.description} />
        ))}
      </div>
    </main>
  );
};

export default Services;
