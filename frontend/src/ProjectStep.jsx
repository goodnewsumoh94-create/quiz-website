import { useState, useEffect, useRef } from "react";

// Runs each check against the iframe's document. Extend this as new check
// types come up (attribute checks, computed style checks, event-driven
// checks like "click #add-btn and see a new <li>", etc.)
function runChecks(doc, checks) {
  return checks.every((check) => {
    try {
      if (check.type === "elementExists") {
        return doc.querySelector(check.selector) !== null;
      }
      if (check.type === "textContent") {
        const el = doc.querySelector(check.selector);
        return el && el.textContent.includes(check.expected);
      }
      if (check.type === "attribute") {
        const el = doc.querySelector(check.selector);
        return el && el.getAttribute(check.attribute) === check.expected;
      }
      if (check.type === "count") {
        return doc.querySelectorAll(check.selector).length >= check.min;
      }
      return false;
    } catch {
      return false;
    }
  });
}

export default function ProjectStep({
  step,
  code,
  onCodeChange,
  previewDoc,
  isCompleted,
  pyodide,
  pyodideReady,
  onComplete,
  onNext,
  isLastStep,
}) {
  const [output, setOutput] = useState("");
  const [feedback, setFeedback] = useState(null); // { correct: bool }
  const iframeRef = useRef(null);

  useEffect(() => {
  setOutput("");
  setFeedback(null);
}, [step.id]);

useEffect(() => {
  if (!["html", "css", "js"].includes(step.language)) return;

  const timeout = setTimeout(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = previewDoc;
    }
  }, 300);

  return () => clearTimeout(timeout);
}, [previewDoc, step.language]);


  async function handleRunPython() {
    if (!pyodide) return;
    let out = "";
    pyodide.setStdout({ batched: (msg) => (out += msg + "\n") });
    try {
      await pyodide.runPythonAsync(code);
      const trimmed = out.trim();
      setOutput(trimmed);
      const expected = (step.expected_output || "").trim();
      const correct = trimmed === expected;
      setFeedback({ correct });
      if (correct) onComplete();
    } catch (err) {
      const lines = err.message.trim().split("\n");
      setOutput("Error: " + lines[lines.length - 1]);
      setFeedback({ correct: false });
    }
  }

  function handleCheckWebStep() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      setOutput("Preview not ready yet — try again in a moment.");
      setFeedback({ correct: false });
      return;
    }
    const checks = step.checks || [];
    const correct = checks.length > 0 && runChecks(doc, checks);
    setOutput(correct ? "All checks passed!" : "Not quite there yet — check the requirements above.");
    setFeedback({ correct });
    if (correct) onComplete();
  }

  const isWebStep = ["html", "css", "js"].includes(step.language);

  return (
    <div className="project-step">
      <h2>Step {step.step_number}</h2>
      <p className="coding-instruction">{step.instructions}</p>

      <div className={isWebStep ? "web-step-layout" : "coding-question"}>
        <textarea
           className="code-editor"
  value={code}
  onChange={(e) => onCodeChange(e.target.value)}
          spellCheck="false"
          disabled={isCompleted}
        />

        {isWebStep && (
          <iframe
            ref={iframeRef}
            title="preview"
            className="live-preview"
            sandbox="allow-scripts"
          />
        )}
      </div>

      <button
        className="run-code-button"
        onClick={step.language === "python" ? handleRunPython : handleCheckWebStep}
        disabled={
          isCompleted || (step.language === "python" && !pyodideReady)
        }
      >
        {step.language === "python" && !pyodideReady ? "Loading Python..." : "▶ Check Step"}
      </button>

      {output && <pre className="code-output">{output}</pre>}

      {feedback && (
        <div className={`feedback ${feedback.correct ? "correct-feedback" : "wrong-feedback"}`}>
          <p className="feedback-title">
            {feedback.correct ? "✓ Step complete!" : "✕ Not quite yet"}
          </p>
          {feedback.correct && !isLastStep && (
            <button className="next" onClick={onNext}>
              Next step →
            </button>
          )}
          {feedback.correct && isLastStep && (
            <p className="feedback-title">🎉 Project complete!</p>
          )}
        </div>
      )}
    </div>
  );
}
