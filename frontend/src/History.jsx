import { useState, useEffect } from "react";
import { fetchHistory } from "./api";

function History({ onBack }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      const data = await fetchHistory();
      setHistory(data);
    }
    loadHistory();
  }, []);

  if (history === null) {
    return <p>Loading history...</p>;
  }

  const hasAttempts = history.overall.total_attempts > 0;
  const percentage = hasAttempts
    ? Math.round((history.overall.correct_attempts / history.overall.total_attempts) * 100)
    : 0;

  return (
    <div className="history-card">
      <h1>📊 Your Progress</h1>

      {hasAttempts ? (
        <div className="overall-stat">
          <span className="overall-percentage">{percentage}%</span>
          <p>
            {history.overall.correct_attempts} / {history.overall.total_attempts} correct overall
          </p>
        </div>
      ) : (
        <p>No attempts yet — go take a quiz!</p>
      )}

      <div className="topic-list">
        {history.by_topic.map((topic) => {
          const topicPercentage = Math.round(
            (topic.correct_attempts / topic.total_attempts) * 100
          );

          return (
            <div key={topic.topic} className="topic-row">
              <span className="topic-name">{topic.topic}</span>
              <span className="topic-percentage">{topicPercentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default History;
