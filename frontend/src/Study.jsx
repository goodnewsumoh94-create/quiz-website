import { useState, useEffect } from "react";
import { fetchStudyContent } from "./api";

function groupByTopic(sections) {
  const grouped = {};

  for (const section of sections) {
    if (!grouped[section.topic]) {
      grouped[section.topic] = [];
    }

    grouped[section.topic].push(section);
  }

  return grouped;
}

function Study({ onBack }) {
  const [allSections, setAllSections] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    async function loadStudyContent() {
      const data = await fetchStudyContent();
      setAllSections(data);
    }

    loadStudyContent();
  }, []);

  if (allSections.length === 0) {
    return (
      <div className="study-card">
        <h1>📚 Study</h1>
        <p>Loading study content...</p>
      </div>
    );
  }

  const grouped = groupByTopic(allSections);

  // Screen 1: Pick a topic
  if (!selectedTopic) {
    return (
      <div className="study-card">

        <h1>📚 Study</h1>

        <p className="study-subtitle">
          Choose a topic to start learning.
        </p>

        <div className="study-topic-list">
          {Object.keys(grouped).map((topic) => (
            <button
              key={topic}
              className="study-topic-button"
              onClick={() => setSelectedTopic(topic)}
            >
              📖 {topic}
            </button>
          ))}
        </div>

        <button
          className="study-back-button"
          onClick={onBack}
        >
          ← Back
        </button>

      </div>
    );
  }

  // Screen 2: Pick a section
  if (!selectedSection) {
    const sectionsForTopic = grouped[selectedTopic];

    return (
      <div className="study-card">

        <button
          className="study-back-button"
          onClick={() => setSelectedTopic(null)}
        >
          ← Back to Topics
        </button>

        <h1>📚 {selectedTopic}</h1>

        <p className="study-subtitle">
          Choose a section to study.
        </p>

        <div className="study-section-list">
          {sectionsForTopic.map((section) => (
            <button
              key={section.id}
              className="study-section-button"
              onClick={() => setSelectedSection(section)}
            >
              <span>📄</span>

              <span>
                {section.title}
              </span>

              <span className="study-arrow">
                →
              </span>
            </button>
          ))}
        </div>

      </div>
    );
  }

  // Screen 3: Read section
  return (
    <div className="study-card">

      <button
        className="study-back-button"
        onClick={() => setSelectedSection(null)}
      >
        ← Back to Sections
      </button>

      <h1>{selectedSection.title}</h1>

      <div className="study-content">
        <p className="section-content">
          {selectedSection.content}
        </p>
      </div>

    </div>
  );
}

export default Study;