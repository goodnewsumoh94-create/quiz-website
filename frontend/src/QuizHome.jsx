import "./Quiz.css";

function QuizHome({ topics, onStart, onProjects }) {
  return (
    <div className="home-card">

      <h1>🧠 Quiz Time!</h1>

      <p className="home-subtitle">
        Choose a topic and test your knowledge.
      </p>

      <div className="topic-grid">

        {topics.map((topic) => (
          <button
            key={topic}
            className="topic-button"
            onClick={() => onStart(topic)}
          >
            {topic}
          </button>
        ))}

      </div>

      <button
        className="projects-button"
        onClick={onProjects}
      >
        🛠️ Projects
      </button>

    </div>
  );
}

export default QuizHome;