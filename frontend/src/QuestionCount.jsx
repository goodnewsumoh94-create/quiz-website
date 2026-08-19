function QuestionCount({ topic, maxQuestions, onStart }) {

  // Build option steps dynamically instead of a fixed [5, 10, 20] list.
  // Always includes 5 and 10 (if there's enough questions for them),
  // then adds steps of 10 up to maxQuestions, and always offers "All".
  const baseSteps = [5, 10, 15, 20, 30, 40, 50];
  const availableOptions = baseSteps.filter(count => count < maxQuestions);

  return (
    <div className="home-card">

      <h1>🧠 {topic}</h1>

      <p className="home-subtitle">
        How many questions do you want?
      </p>

      <div className="topic-grid">

        {availableOptions.map(count => (
          <button
            key={count}
            className="topic-button"
            onClick={() => onStart(count)}
          >
            {count} Questions
          </button>
        ))}

        <button
          key="all"
          className="topic-button"
          onClick={() => onStart(maxQuestions)}
        >
          All {maxQuestions} Questions
        </button>

      </div>

    </div>
  );
}

export default QuestionCount;
