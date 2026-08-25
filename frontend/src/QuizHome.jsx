import "./Quiz.css";

function QuizHome({ topics, onStart, onProjects, onHistory, onStudy }) {
  console.log("QuizHome rendered");
  console.log("onProjects:", onProjects);

  return (
    <div className="home-card">

      <h1>🧠 Quiz Time!</h1>

      <p className="home-subtitle">
        Choose a topic and test your knowledge.
      </p>

      {/* TOPICS ONLY */}
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

      {/* HOME ACTIONS */}
      <div className="home-actions">

        {/*<button*/}
        {/*  type="button"*/}
        {/*  className="projects-button"*/}
        {/*  onClick={onProjects}*/}
        {/*>*/}
        {/*   Projects*/}
        {/*</button>*/}

      </div>

    </div>
  );
}

export default QuizHome;