import { useState, useEffect, useRef } from "react";
import { markHintUsed } from "./api";

// Runs each check against the iframe's document. Extend this as new check
// types come up (attribute checks, computed style checks, etc.)
function runChecks(doc, checks) {
  if (!Array.isArray(checks)) return false;

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
      // Simulates a real interaction, then asserts on what happened.
      // e.g. { type: "interaction", trigger: "#add-btn", event: "click",
      //        assert: { type: "count", selector: "#todo-list li", min: 1 } }
      if (check.type === "computedStyle") {
        const el = doc.querySelector(check.selector);
        if (!el) return false;
        const styles = doc.defaultView.getComputedStyle(el);
        return styles[check.property] === check.expected;
      }
      if (check.type === "interaction") {
        // setValueOn lets you type into one element (e.g. an input) before
        // triggering an event on a different element (e.g. a button) --
        // needed for "type something, click Add, see it appear" checks.
        if (check.setValueOn) {
          const valueEl = doc.querySelector(check.setValueOn);
          if (valueEl) valueEl.value = check.value ?? "";
        }
        const trigger = doc.querySelector(check.trigger);
        if (!trigger) return false;
        if (check.value !== undefined && !check.setValueOn) trigger.value = check.value;
        const eventName = check.event || "click";
        if (eventName === "click") {
          trigger.click();
        } else {
          trigger.dispatchEvent(new Event(eventName, { bubbles: true }));
        }
        return runChecks(doc, [check.assert]);
      }
      return false;
    } catch {
      return false;
    }
  });
}

export default function ProjectStep({
  step,
  projectId,
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
  const [previewReady, setPreviewReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    setOutput("");
    setFeedback(null);
    setPreviewReady(false);
    setShowHint(false);
    setShowSolution(false);
  }, [step.id]);

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

  function handleRunSql() {
    const normalize = (sql) =>
      (sql || "").trim().replace(/\s+/g, " ").replace(/\s*;\s*$/, ";").toLowerCase();

    const correct = normalize(code) === normalize(step.solution_code);
    setOutput(correct ? "SQL query is correct!" : "The SQL query still has an error.");
    setFeedback({ correct });
    if (correct) onComplete();
  }

  function handleCheckWebStep() {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;

    if (!doc) {
      setOutput("Preview not ready yet — try again in a moment.");
      setFeedback({ correct: false });
      return;
    }

    // Make sure checks are always an array (mysql-connector can return
    // JSON columns as either a parsed value or a raw string depending on version).
    let checks = step.checks || [];
    if (typeof checks === "string") {
      try {
        checks = JSON.parse(checks);
      } catch (err) {
        console.error("Could not parse checks:", err);
        setOutput("There is a problem with this project's checks.");
        setFeedback({ correct: false });
        return;
      }
    }

    console.log("DEBUG doc body:", doc.body.innerHTML);
    console.log("DEBUG parsed checks:", checks);
    checks.forEach((c) => {
      console.log("DEBUG check:", c.selector, "found:", doc.querySelector(c.selector));
    });

    const correct =
      Array.isArray(checks) && checks.length > 0 && runChecks(doc, checks);

    setOutput(
      correct
        ? "All checks passed!"
        : "Not quite there yet — check the requirements above."
    );
    setFeedback({ correct });
    if (correct) onComplete();
  }

  function handleShowHint() {
    setShowHint(true);
    markHintUsed(projectId, step.step_number, "hint").catch(() => {
      // Non-critical — don't block the UI on analytics failing.
    });
  }

  function handleShowSolution() {
    setShowSolution(true);
    markHintUsed(projectId, step.step_number, "solution").catch(() => {});
  }

  const isWebStep = ["html", "css", "js"].includes(step.language);
  const isSqlStep = step.language === "sql";

  function handleRunClick() {
    if (step.language === "python") return handleRunPython();
    if (isSqlStep) return handleRunSql();
    return handleCheckWebStep();
  }

  const isLoading =
    (step.language === "python" && !pyodideReady) ||
    (isWebStep && !previewReady);

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
            sandbox="allow-scripts allow-same-origin"
            srcDoc={previewDoc}
            onLoad={() => setPreviewReady(true)}
          />
        )}
      </div>

      <button
        className="run-code-button"
        onClick={handleRunClick}
        disabled={isCompleted || isLoading}
      >
        {step.language === "python" && !pyodideReady
          ? "Loading Python..."
          : isWebStep && !previewReady
          ? "Loading Preview..."
          : "▶ Check Step"}
      </button>

      {output && <pre className="code-output">{output}</pre>}

      {feedback && (
        <div className={`feedback ${feedback.correct ? "correct-feedback" : "wrong-feedback"}`}>
          <p className="feedback-title">
            {feedback.correct ? "✓ Step complete!" : "✕ Not quite yet"}
          </p>

          {!feedback.correct && (
            <div className="hint-panel">
              {step.hint && !showHint && !showSolution && (
                <button className="show-solution-button" onClick={handleShowHint}>
                  💡 Need a hint?
                </button>
              )}

              {showHint && !showSolution && (
                <div className="solution-reveal">
                  <p className="solution-label">Hint:</p>
                  <p className="explanation">{step.hint}</p>
                  {step.solution_code && (
                    <button className="show-solution-button" onClick={handleShowSolution}>
                      Still stuck? Show solution
                    </button>
                  )}
                </div>
              )}

              {!step.hint && step.solution_code && !showSolution && (
                <button className="show-solution-button" onClick={handleShowSolution}>
                  💡 Show Solution
                </button>
              )}

              {showSolution && (
                <div className="solution-reveal">
                  <p className="solution-label">Example solution:</p>
                  <pre className="solution-code">{step.solution_code}</pre>
                </div>
              )}
            </div>
          )}

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
