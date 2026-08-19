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
        return <p>Loading study content...</p>;
    }

    const grouped = groupByTopic(allSections);

    // Screen 1: pick a topic
    if (!selectedTopic) {
        return (
            <div className="study-card">
                <h1>📚 Study</h1>
                <div className="topic-list">
                    {Object.keys(grouped).map((topic) => (
                        <button key={topic} onClick={() => setSelectedTopic(topic)}>
                            {topic}
                        </button>
                    ))}
                </div>
                <button onClick={onBack}>← Back</button>
            </div>
        );
    }

    // Screen 2: pick a section within the topic
    if (!selectedSection) {
        const sectionsForTopic = grouped[selectedTopic];

        return (
            <div className="study-card">
                <h2>{selectedTopic}</h2>
                <div className="section-list">
                    {sectionsForTopic.map((section) => (
                        <button key={section.id} onClick={() => setSelectedSection(section)}>
                            {section.title}
                        </button>
                    ))}
                </div>
                <button onClick={() => setSelectedTopic(null)}>← Back to Topics</button>
            </div>
        );
    }

    return (
        <div className="study-card">
            <h2>{selectedSection.title}</h2>
            <p className="section-content">{selectedSection.content}</p>
        </div>
    );
}

export default Study;