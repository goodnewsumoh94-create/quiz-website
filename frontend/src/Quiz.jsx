import { useState, useEffect, forwardRef, useImperativeHandle } from "react";import { fetchQuestions, submitAnswer } from "./api";
import QuizHome from "./QuizHome";
import QuestionCount from "./QuestionCount.jsx";
import "./Quiz.css";
import Study from "./Study.jsx";
const Quiz = forwardRef(function Quiz({ onShowHistory, onshowStudy, onHomeChange }, ref) {
  const [allQuestions, setAllQuestions] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);

  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questionCount, setQuestionCount] = useState(null);
  const [timeLimit, setTimeLimit] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [timeUp, setTimeUp] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);


  // --- Coding-exercise specific state ---
  const [code, setCode] = useState("");
  const [pyodide, setPyodide] = useState(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [codeOutput, setCodeOutput] = useState("");
  const [codeFeedback, setCodeFeedback] = useState(null); // { correct: bool }
  const [quizMode, setQuizMode] = useState(null);
  const [showSolution, setShowSolution] = useState(false);

  // Load questions once on mount
  useEffect(() => {
    async function loadQuestions() {
      const data = await fetchQuestions();
      setAllQuestions(data);
      const uniqueTopics = [...new Set(data.map((q) => q.topic))];
      setTopics(uniqueTopics);
    }
    loadQuestions();
  }, []);

  // Load Pyodide once on mount (separate from question data — unrelated concerns)
  useEffect(() => {
    async function loadPyodideRuntime() {
      const pyodideInstance = await window.loadPyodide();
      setPyodide(pyodideInstance);
      setPyodideReady(true);
    }
    loadPyodideRuntime();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLimit === null || timeLimit === 0 || quizQuestions.length === 0) {
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLimit, quizQuestions.length]);

  useEffect(() => {
    if (timeLeft === 0 && timeLimit > 0) {
      setTimeUp(true);
    }
  }, [timeLeft, timeLimit]);

  useEffect(() => {
  if (onHomeChange) onHomeChange(!selectedTopic);
}, [selectedTopic]);

useImperativeHandle(ref, () => ({
  goHome: chooseAnotherTopic
}));

  function chooseAnotherTopic() {
    setSelectedTopic(null);
    setQuestionCount(null);
    setQuizQuestions([]);
    setTimeLimit(null);
    setCurrentIndex(0);
    setScore(0);
    setSelected(null);
    setFeedback(null);
    setTimeLeft(0);
    setTimeUp(false);
    setQuizMode(null)
  }

  function startQuiz(topic) {
    setSelectedTopic(topic);
    setQuestionCount(null);
  }

  function shuffleQuestions(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }
    return shuffled;
  }

function startQuizWithCount(count) {
  const topicQuestions = allQuestions.filter((q) => {
    if (q.topic !== selectedTopic) return false;

    if (quizMode === "coding") {
      return q.question_type === "coding";
    }

    if (quizMode === "debugging") {
      return q.question_type === "debugging";
    }

    return q.question_type === "multiple_choice";
  });

  const shuffledQuestions = shuffleQuestions(topicQuestions);
  const selectedQuestions = shuffledQuestions.slice(0, count);

  setQuizQuestions(selectedQuestions);
  setQuestionCount(count);
  setCurrentIndex(0);
  setScore(0);
  setSelected(null);
  setFeedback(null);
  setCode("");
  setCodeOutput("");
  setCodeFeedback(null);
  setTimeUp(false);
}

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

  function getOptionClass(option) {
    if (!feedback) return "";
    if (option === selected && feedback.correct) return "correct";
    if (option === selected && !feedback.correct) return "wrong";
    if (!feedback.correct && option === feedback.correct_answer) return "correct";
    return "";
  }

async function handleAnswer(answer) {
  console.time("answer");

  setSelected(answer);

  const result = await submitAnswer(currentQuestion.id, answer);

  console.timeEnd("answer");

  setFeedback(result);

  if (result.correct) {
    setScore((prevScore) => prevScore + 1);
  }
}

  // Runs the code in-browser via Pyodide and checks it against expected_output.
  // Nothing here ever touches the Flask server — execution is entirely client-side.
  async function handleRunCode() {
    if (!pyodide) return;

    let output = "";
    pyodide.setStdout({
      batched: (msg) => {
        output += msg + "\n";
      },
    });

    try {
      await pyodide.runPythonAsync(code);
      const trimmedOutput = output.trim();
      setCodeOutput(trimmedOutput);

      const expected = (currentQuestion.expected_output || "").trim();
      const isCorrect = trimmedOutput === expected;
      setCodeFeedback({ correct: isCorrect });

      if (isCorrect) {
        setScore((prevScore) => prevScore + 1);
      }
    } catch (err) {
  const lines = err.message.trim().split("\n");
  const lastLine = lines[lines.length - 1];
  setCodeOutput("Error: " + lastLine);
  setCodeFeedback({ correct: false });
}
  }

  function handleTabKey(e) {
  if (e.key === "Tab") {
    e.preventDefault();

    const cursorStart = e.target.selectionStart;
    const cursorEnd = e.target.selectionEnd;

    const newCode =
      code.substring(0, cursorStart) + "    " + code.substring(cursorEnd);

    setCode(newCode);

    // Move the cursor to right after the inserted spaces,
    // instead of leaving it at the start (React re-renders wipe cursor position otherwise)
    setTimeout(() => {
      e.target.selectionStart = e.target.selectionEnd = cursorStart + 4;
    }, 0);
  }
}

function handleRunJsCode() {
  let output = "";
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join(" ") + "\n";
  };

  try {
      new Function(code)();
      const trimmedOutput = output.trim();
      setCodeOutput(trimmedOutput);

      const expected = (currentQuestion.expected_output || "").trim();
      const isCorrect = trimmedOutput === expected;
      setCodeFeedback({ correct: isCorrect });

      if (isCorrect) {
        setScore((prevScore) => prevScore + 1);
      }
      } catch (err) {
    setCodeOutput("Error: " + err.message);
    setCodeFeedback({ correct: false });
  } finally {
    console.log = originalLog; // always restore the real console.log, even on error
  }
}

  function handleNext() {
    setCurrentIndex(currentIndex + 1);
    setSelected(null);
    setFeedback(null);
    setCode("");
    setCodeOutput("");
    setCodeFeedback(null);
    setShowSolution(false)
  }

  // ---- Guard clauses / screens ----

  if (allQuestions.length === 0) {
    return <p>Loading...</p>;
  }
if (!selectedTopic) {
  return (
    <div>
      <QuizHome topics={topics} onStart={startQuiz} />
      <button className="view-history" onClick={onShowHistory}>View History</button>
      <button className="study" onClick={onshowStudy}>Study</button>
    </div>
  );
}

  if (quizMode === null) {
  const hasCodingQuestions = allQuestions.some(
    (q) => q.topic === selectedTopic && q.question_type === "coding"
  );

  return (
    <div className="mode-choice">
      <h2>How do you want to practice {selectedTopic}?</h2>

      <button onClick={() => setQuizMode("multiple_choice")}>
  📝 Multiple Choice
</button>

<button onClick={() => setQuizMode("coding")}>
  💻 Coding Exercise
</button>

<button onClick={() => setQuizMode("debugging")}>
  🐛 Debugging Challenge
</button>
    </div>
  );
}

  if (questionCount === null) {
    const availableQuestions = allQuestions.filter((q) => {
  if (q.topic !== selectedTopic) return false;

  if (quizMode === "coding") {
    return q.question_type === "coding";
  }

  if (quizMode === "debugging") {
    return q.question_type === "debugging";
  }

  return q.question_type === "multiple_choice";
});
    return (
      <QuestionCount
        topic={selectedTopic}
        maxQuestions={availableQuestions.length}
        onStart={startQuizWithCount}
      />
    );
  }

  if (timeLimit === null) {
    return (
      <div className="timer-choice">
        <h2>⏱️ Choose Your Time</h2>
        <p>How much time do you want for this quiz?</p>
        <div className="timer-options">
          <button onClick={() => { setTimeLimit(30); setTimeLeft(30); }}>⚡ 30 Seconds</button>
          <button onClick={() => { setTimeLimit(60); setTimeLeft(60); }}>🕐 1 Minute</button>
          <button onClick={() => { setTimeLimit(120); setTimeLeft(120); }}>⏱️ 2 Minutes</button>
          <button onClick={() => { setTimeLimit(300); setTimeLeft(300); }}>🕔 5 Minutes</button>
          <button className="no-timer" onClick={() => { setTimeLimit(0); setTimeLeft(0); }}>
            🧘 No Timer
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex >= quizQuestions.length || timeUp) {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    let message;
    if (percentage >= 90) message = "🏆 Excellent!";
    else if (percentage >= 70) message = "🔥 Great job!";
    else if (percentage >= 50) message = "👍 Good effort!";
    else message = "💪 Keep practicing!";

    return (
      <div className="results-card">
        <h1>{timeUp ? "⏰ Time's Up!" : "🎉 Quiz Complete!"}</h1>

        {timeUp && <p className="time-up-message">Your time has run out. Here's how you did!</p>}

        <div className="score-circle">
          <span>{percentage}%</span>
        </div>

        <h2>{message}</h2>

        <p className="score-text">
          You scored <strong>{score}</strong> out of <strong>{quizQuestions.length}</strong>
        </p>

        <div className="result-stats">
          <div className="stat">
            <span className="stat-number correct-number">{score}</span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="stat">
            <span className="stat-number wrong-number">{quizQuestions.length - score}</span>
            <span className="stat-label">Wrong</span>
          </div>
        </div>

        <div className="result-buttons">
          <button
            className="retry-button"
            onClick={() => {
              setCurrentIndex(0);
              setScore(0);
              setSelected(null);
              setFeedback(null);
              setTimeLeft(timeLimit);
              setTimeUp(false);
              setQuizMode(null)
            }}
          >
            🔄 Try Again
          </button>

          <button className="another-topic-button" onClick={chooseAnotherTopic}>
            📚 Choose Another Topic
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentIndex];

  return (
    <div className="quiz-card">
      <h1>{selectedTopic} QUIZ</h1>
      <p className="question-count">
        Question {currentIndex + 1} of {quizQuestions.length}
      </p>

      {timeLimit > 0 && (
        <div className={`timer ${timeLeft <= 10 ? "timer-warning" : ""}`}>
          ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
        ></div>
      </div>

{currentQuestion.question_type === "debugging" && (
  <>
    <h2 className="question">
      🐛 Debug This Code
    </h2>

    <p className="coding-instruction">
      {currentQuestion.question_text}
    </p>
  </>
)}

{currentQuestion.question_type === "coding" && (
  <p className="coding-instruction">
    {currentQuestion.question_text}
  </p>
)}

{currentQuestion.question_type === "multiple_choice" && (
  <h2 className="question">
    {currentQuestion.question_text}
  </h2>
)}

{currentQuestion.question_type === "coding" ||
 currentQuestion.question_type === "debugging" ? (

  <div className="coding-question">

    <textarea
      className="code-editor"
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onKeyDown={handleTabKey}
      placeholder={
        currentQuestion.question_type === "debugging"
          ? "Fix the code here..."
          : "Write your code here..."
      }
      spellCheck="false"
      disabled={codeFeedback?.correct === true}
    />

    <button
      className="run-code-button"
      onClick={
        currentQuestion.language === "python"
          ? handleRunCode
          : handleRunJsCode
      }
      disabled={
        (currentQuestion.language === "python" && !pyodideReady) ||
        codeFeedback?.correct === true
      }
    >
      {currentQuestion.language === "python" && !pyodideReady
        ? "Loading Python..."
        : "▶ Run Code"}
    </button>

    {codeOutput && (
      <pre className="code-output">
        {codeOutput}
      </pre>
    )}

    {codeFeedback && (
      <div
        className={`feedback ${
          codeFeedback.correct
            ? "correct-feedback"
            : "wrong-feedback"
        }`}
      >

        <p className="feedback-title">
          {codeFeedback.correct
            ? "✓ Correct!"
            : currentQuestion.question_type === "debugging"
              ? "✕ Not quite — keep debugging!"
              : "✕ Output didn't match."}
        </p>

        {!codeFeedback.correct && (
          <div className="solution-reveal">

            <p className="explanation">
              Expected output: {currentQuestion.expected_output}
            </p>

            {currentQuestion.question_type === "debugging" ? (
              <>
                <p className="debug-hint">
                  🐛 Your code isn't correct yet.
                  Try fixing the bug and run it again.
                </p>

                {!showSolution ? (
                  <button
                    className="show-solution-button"
                    onClick={() => setShowSolution(true)}
                  >
                    💡 Show Solution
                  </button>
                ) : (
                  <>
                    <p className="solution-label">
                      Example solution:
                    </p>

                    <pre className="solution-code">
                      {currentQuestion.solution_code}
                    </pre>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="solution-label">
                  Example solution:
                </p>

                <pre className="solution-code">
                  {currentQuestion.solution_code}
                </pre>
              </>
            )}

          </div>
        )}

        {codeFeedback.correct && (
          <button className="next" onClick={handleNext}>
            Next →
          </button>
        )}

        {!codeFeedback.correct &&
          currentQuestion.question_type === "coding" && (
            <button className="next" onClick={handleNext}>
              Next →
            </button>
          )}

        {!codeFeedback.correct &&
          currentQuestion.question_type === "debugging" &&
          showSolution && (
            <button className="next" onClick={handleNext}>
              Next →
            </button>
          )}

      </div>
    )}

  </div>

) : (
    <>
          <div className="options">
            <button
              className={`option ${getOptionClass("A")}`}
              onClick={() => handleAnswer("A")}
              disabled={feedback !== null}
            >
              <span>A</span>
              {currentQuestion.option_a}
            </button>

            <button
              className={`option ${getOptionClass("B")}`}
              onClick={() => handleAnswer("B")}
              disabled={feedback !== null}
            >
              <span>B</span>
              {currentQuestion.option_b}
            </button>

            <button
              className={`option ${getOptionClass("C")}`}
              onClick={() => handleAnswer("C")}
              disabled={feedback !== null}
            >
              <span>C</span>
              {currentQuestion.option_c}
            </button>

            <button
              className={`option ${getOptionClass("D")}`}
              onClick={() => handleAnswer("D")}
              disabled={feedback !== null}
            >
              <span>D</span>
              {currentQuestion.option_d}
            </button>
          </div>

     {feedback && (
  <div className={`feedback ${feedback.correct ? "correct-feedback" : "wrong-feedback"}`}>
    <p className="feedback-title">
      {feedback.correct ? "✓ Correct!" : "✕ Wrong!"}
    </p>

    <p className="explanation">{feedback.explanation}</p>

    <button className="next" onClick={handleNext}>
      Next →
    </button>
  </div>
)}

        </>
      )}
    </div>
  );
})

export default Quiz;
