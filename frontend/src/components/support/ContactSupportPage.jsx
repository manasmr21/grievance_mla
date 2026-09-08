import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/student-pages.css';
import '../../styles/ContactSupport.css';
import '../../styles/admin/Dashboard.css';

const ContactSupportPage = ({
  pageClass = 'student-page contact-support-page',
  headerClass = 'page-header',
  title = 'Contact Support',
  subtitle = 'Need help? Our support team is here to assist you.',
  initialFormData = {},
  subjectOptions = [],
  categoryOptions = [],
  faqPath = '/student/faq',
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    category: '',
    message: '',
    ...initialFormData,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'message' && value.length > 1000) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={pageClass}>
      <header className={headerClass}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      <div className="contact-content-grid">
        <div className="contact-main-col">
          <section className="dashboard-card contact-form-card">
            <div className="card-head">
              <h3>Send us a message</h3>
            </div>
            <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input id="fullName" type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email address" />
              </div>
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <div className="select-wrapper">
                  <select id="subject" name="subject" value={formData.subject} onChange={handleChange}>
                    <option value="" disabled>Select a subject</option>
                    {subjectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <div className="select-wrapper">
                  <select id="category" name="category" value={formData.category} onChange={handleChange}>
                    <option value="" disabled>Select a category</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Describe your issue or question in detail..." rows={6} />
                <div className="char-counter">{formData.message.length} / 1000 characters</div>
              </div>
              <button type="submit" className="send-message-btn">
                <i className="fa-solid fa-paper-plane" /> Send Message
              </button>
            </form>
          </section>
        </div>

        <aside className="contact-side-col">
          <section className="dashboard-card before-contact-card">
            <div className="card-head">
              <h3>Before you contact us</h3>
              <p>You may find answers in our Help Center.</p>
            </div>
            <div className="help-center-links">
              <button type="button" className="help-link-item" onClick={() => navigate(faqPath)}>
                <span>Browse FAQs</span>
                <i className="fa-solid fa-chevron-right arrow" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ContactSupportPage;
