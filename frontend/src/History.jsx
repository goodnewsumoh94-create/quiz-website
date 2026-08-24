import { useState, useEffect } from "react";
import { fetchHistory } from "./api";

function History({ onBack }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchHistory();

        if (data.error) {
          setError(data.error);
          return;
        }

        setHistory(data);
      } catch (err) {
        setError("Could not load your quiz history.");
      }
    }

    loadHistory();
  }, []);

  if (error) {
    return (
      <div className="history-card">
        <h1>📊 Your Progress</h1>
        <p>{error}</p>

        <button onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  if (history === null) {
    return (
      <div className="history-card">
        <h1>📊 Your Progress</h1>
        <p>Loading history...</p>
      </div>
    );
  }

  const totalAttempts = Number(history.overall.total_attempts || 0);
  const correctAttempts = Number(history.overall.correct_attempts || 0);

  const percentage =
    totalAttempts > 0
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0;

  return (
    <div className="history-card">

      <button className="history-back-btn" onClick={onBack}>
        ← Back
      </button>

      <h1>📊 Your Progress</h1>

      {totalAttempts === 0 ? (
        <div className="empty-history">
          <div className="empty-history-icon">📝</div>

          <h2>No quiz attempts yet</h2>

          <p>
            Complete a quiz and your progress will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Overall Progress */}
          <div className="overall-stat">
            <div className="progress-circle">
              <span>{percentage}%</span>
            </div>

            <h2>Overall Accuracy</h2>

            <p>
              {correctAttempts} / {totalAttempts} correct
            </p>
          </div>

          {/* Statistics */}
          <div className="history-stats">

            <div className="history-stat">
              <span className="stat-icon">📝</span>
              <strong>{totalAttempts}</strong>
              <span>Total Attempts</span>
            </div>

            <div className="history-stat">
              <span className="stat-icon">✅</span>
              <strong>{correctAttempts}</strong>
              <span>Correct</span>
            </div>

            <div className="history-stat">
              <span className="stat-icon">❌</span>
              <strong>{totalAttempts - correctAttempts}</strong>
              <span>Incorrect</span>
            </div>

          </div>

          {/* Topic Progress */}
          <div className="topic-section">

            <h2>📚 Progress by Topic</h2>

            {history.by_topic.length === 0 ? (
              <p>No topic data available.</p>
            ) : (
              <div className="topic-list">

                {history.by_topic.map((topic) => {

                  const topicTotal = Number(topic.total_attempts || 0);
                  const topicCorrect = Number(topic.correct_attempts || 0);

                  const topicPercentage =
                    topicTotal > 0
                      ? Math.round(
                          (topicCorrect / topicTotal) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={topic.topic}
                      className="topic-row"
                    >
                      <div className="topic-info">

                        <span className="topic-name">
                          {topic.topic}
                        </span>

                        <span className="topic-score">
                          {topicCorrect} / {topicTotal}
                        </span>

                      </div>

                      <div className="topic-progress">

                        <div className="topic-progress-bar">
                          <div
                            className="topic-progress-fill"
                            style={{
                              width: `${topicPercentage}%`
                            }}
                          />
                        </div>

                        <span className="topic-percentage">
                          {topicPercentage}%
                        </span>

                      </div>
                    </div>
                  );
                })}

              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}

export default History;