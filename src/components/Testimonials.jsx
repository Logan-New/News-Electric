import React from 'react';

const TestimonialCard = ({ customerName, testimonial }) => {
  return (
    <div className="testimonial-card">
      <p>"{testimonial}"</p>
      <h4>- {customerName}</h4>
    </div>
  );
};

export default TestimonialCard;
