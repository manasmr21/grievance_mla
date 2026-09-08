import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/student-pages.css';
import '../../styles/HelpFAQ.css';
import '../../styles/admin/Dashboard.css';

const HelpFAQPage = ({
  pageClass = 'student-page help-faq-page',
  layout = 'student',
  heroTitle = 'How can we help you today?',
  heroSubtitle = 'Browse help topics below to get started',
  topics = [],
  faqsList = [],
  supportPath = '/student/support',
  breadcrumbRoot = 'Help & FAQs',
  backLabel = 'Back to FAQs',
}) => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [openIndex, setOpenIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const filteredFaqs = useMemo(() => {
    if (!selectedTopic) return faqsList;
    return faqsList.filter((faq) => faq.topicId === selectedTopic);
  }, [selectedTopic, faqsList]);

  const displayFaqs = useMemo(() => {
    if (layout === 'admin') {
      return selectedTopic ? filteredFaqs : faqsList.slice(0, 5);
    }
    if (selectedTopic || showAll) return filteredFaqs;
    return filteredFaqs.slice(0, 5);
  }, [layout, selectedTopic, showAll, filteredFaqs, faqsList]);

  const handleSelectTopic = (topicId) => {
    setSelectedTopic(topicId);
    setOpenIndex(0);
    setShowAll(false);
  };

  const renderFaqs = (title) => (
    <section className="dashboard-card faqs-section">
      <div className="section-head-alt">
        <h3>{title}</h3>
      </div>
      <div className="faqs-list-alt">
        {displayFaqs.map((faq, index) => (
          <div key={faq.q} className={`faq-row-alt ${openIndex === index ? 'active' : ''}`}>
            <button type="button" className="faq-toggle-btn" onClick={() => setOpenIndex(openIndex === index ? -1 : index)}>
              <span className="faq-q-text">
                <span className="faq-num">{index + 1}.</span> {faq.q}
              </span>
              <span className="toggle-icon">
                <i className="fa-solid fa-chevron-down" />
              </span>
            </button>
            <div className="faq-ans-wrapper">
              <div className="faq-ans-content">
                <div className="faq-ans-text" style={{ whiteSpace: 'pre-line' }}>
                  <p>{faq.a}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {layout === 'student' && !selectedTopic && filteredFaqs.length > 5 && (
        <div className="faqs-footer">
          <button type="button" className="view-all-faqs-btn" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less FAQs' : 'View All FAQs'}{' '}
            <i className={`fa-solid ${showAll ? 'fa-arrow-up' : 'fa-arrow-right'}`} />
          </button>
        </div>
      )}
    </section>
  );

  const renderTopics = () => (
    <section className="dashboard-card topics-section">
      <div className="section-head-alt">
        <h3>Browse by Topics</h3>
      </div>
      <div className="topics-grid">
        {topics.map((topic) => (
          <div key={topic.id} className="topic-card" onClick={() => handleSelectTopic(topic.id)} role="presentation">
            <div className="topic-icon">
              <i className={topic.icon} />
            </div>
            <h4>{topic.title}</h4>
            <p>{topic.desc}</p>
            <span>{topic.count}</span>
          </div>
        ))}
      </div>
    </section>
  );

  if (selectedTopic) {
    const topic = topics.find((t) => t.id === selectedTopic);
    return (
      <div className={pageClass}>
        {layout === 'admin' ? (
          <>
            <nav className="breadcrumbs">
              <span>{breadcrumbRoot}</span>
              <i className="fa-solid fa-chevron-right" />
              <span className="current">{topic?.title}</span>
            </nav>
            <button type="button" className="back-to-help-btn" onClick={() => setSelectedTopic(null)}>
              <i className="fa-solid fa-arrow-left" /> {backLabel}
            </button>
          </>
        ) : null}

        <div className="help-content-grid">
          <div className="help-main-col">
            {layout !== 'admin' && (
              <header className="topic-detail-header">
                <div className="topic-header-top-row">
                  <button type="button" className="back-link-btn" onClick={() => setSelectedTopic(null)}>
                    <i className="fa-solid fa-arrow-left" />
                    <span>{backLabel}</span>
                  </button>
                </div>
                <div className="topic-header-content">
                  <div className="topic-info-side">
                    <div className="topic-icon-large">
                      <i className={topic?.icon} />
                    </div>
                    <div className="topic-header-text">
                      <h1>{topic?.title}</h1>
                      <p>Find answers regarding {topic?.title?.toLowerCase()}.</p>
                    </div>
                  </div>
                </div>
              </header>
            )}

            {layout === 'admin' && (
              <header className="topic-detail-header dashboard-card">
                <div className="topic-header-main">
                  <div className="topic-icon-large">
                    <i className={topic?.icon} />
                  </div>
                  <div className="topic-header-text">
                    <h1>{topic?.title}</h1>
                    <p>Learn best practices for {topic?.title?.toLowerCase()}.</p>
                  </div>
                </div>
              </header>
            )}

            {renderFaqs(`${topic?.title} Q&As`)}
          </div>

          <aside className="help-side-col">
            <section className="dashboard-card still-help-card">
              <h3>Still need help?</h3>
              <p>Contact our support team for assistance.</p>
              <button type="button" className="contact-support-side-btn" onClick={() => navigate(supportPath)}>
                Contact Support
              </button>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      {layout === 'student' && (
        <header className="help-hero-header">
          <div className="hero-content">
            <h1>{heroTitle}</h1>
            <p>{heroSubtitle}</p>
          </div>
        </header>
      )}

      {layout === 'admin' && (
        <header className="admin-overview-hero">
          <div className="admin-overview-copy">
            <h1>{heroTitle}</h1>
            <p>{heroSubtitle}</p>
          </div>
        </header>
      )}

      <div className="help-content-grid">
        <div className="help-main-col">
          {renderTopics()}
          {renderFaqs('Frequently Asked Questions')}
        </div>

        <aside className="help-side-col">
          <section className="dashboard-card need-help-card">
            <h3>Need More Help?</h3>
            <p>Can&apos;t find what you&apos;re looking for?</p>
            <button type="button" className="contact-support-primary" onClick={() => navigate(supportPath)}>
              Contact Support <i className="fa-solid fa-arrow-right" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default HelpFAQPage;
