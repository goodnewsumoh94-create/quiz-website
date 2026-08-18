function QuestionCount({ topic, maxQuestions, onStart }) {

  const availableOptions = [5, 10, 20, 50];

  return (
    <div className="home-card">

      <h1>🧠 {topic}</h1>

      <p className="home-subtitle">
        How many questions do you want?
      </p>

      <div className="topic-grid">

        {availableOptions
          .filter(count => count <= maxQuestions)
          .map(count => (
            <button
              key={count}
              className="topic-button"
              onClick={() => onStart(count)}
            >
              {count} Questions
            </button>
          ))}

      </div>

    </div>
  );
}

export default QuestionCount;