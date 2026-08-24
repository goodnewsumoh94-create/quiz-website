import { useState, useEffect } from "react";
import ProjectStep from "./ProjectStep";
import { fetchProjectSteps, fetchProjectProgress, saveProjectProgress } from "./api";
import "./Quiz.css"; // reuse existing card/button styles for now

// Combines every html/css/js step's code, up to and including uptoStepNumber,
// into one { html, css, js } bundle — this is what lets step 3's JS actually
// find the button that step 1's HTML created.
function buildAccumulatedCode(steps, stepCode, uptoStepNumber) {
  const acc = { html: "", css: "", js: "" };
  steps
    .filter((s) => s.step_number <= uptoStepNumber && ["html", "css", "js"].includes(s.language))
    .forEach((s) => {
      const code = stepCode[s.step_number] ?? s.starter_code ?? "";
      acc[s.language] += "\n" + code;
    });
  return acc;
}

function buildPreviewDoc(acc) {
  return `${acc.html}\n<style>${acc.css}</style>\n<script>${acc.js}<\/script>`;
}

export default function ProjectView({ project, pyodide, pyodideReady, onExit }) {
  const [steps, setSteps] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]); // array of step_numbers
  const [viewingStep, setViewingStep] = useState(1); // which step is on screen (can go back)
  const [loading, setLoading] = useState(true);
  // Code for every step the user has touched, keyed by step_number. Lives here
  // (not in ProjectStep) so the preview can see code from earlier steps too.
  const [stepCode, setStepCode] = useState({});

  useEffect(() => {
    async function load() {
      const [stepData, progressData] = await Promise.all([
        fetchProjectSteps(project.id),
        fetchProjectProgress(project.id),
      ]);
      setSteps(stepData);
      setCompletedSteps(progressData);
      // land on the first incomplete step, or the last step if all done
      const nextIncomplete = stepData.find((s) => !progressData.includes(s.step_number));
      setViewingStep(nextIncomplete ? nextIncomplete.step_number : stepData.length);
      setLoading(false);
    }
    load();
  }, [project.id]);

  async function handleStepComplete(stepNumber) {
    await saveProjectProgress(project.id, stepNumber);
    setCompletedSteps((prev) => [...new Set([...prev, stepNumber])]);
  }

  if (loading) return <p>Loading project...</p>;

  const highestUnlocked = Math.max(0, ...completedSteps) + 1;
  const currentStepData = steps.find((s) => s.step_number === viewingStep);
  const isCurrentStepLocked = viewingStep > highestUnlocked;

  const accumulated = buildAccumulatedCode(steps, stepCode, viewingStep);
  const previewDoc = buildPreviewDoc(accumulated);

  function handleCodeChange(newCode) {
    setStepCode((prev) => ({ ...prev, [viewingStep]: newCode }));
  }

  return (
    <div className="project-view">
      <button className="another-topic-button" onClick={onExit}>
        ← Back to Projects
      </button>

      <h1>{project.title}</h1>
      <p className="coding-instruction">{project.description}</p>

      <div className="step-nav">
        {steps.map((s) => (
          <button
            key={s.step_number}
            className={`step-pill ${s.step_number === viewingStep ? "active" : ""} ${
              completedSteps.includes(s.step_number) ? "done" : ""
            }`}
            disabled={s.step_number > highestUnlocked}
            onClick={() => setViewingStep(s.step_number)}
          >
            {completedSteps.includes(s.step_number) ? "✓" : s.step_number}
          </button>
        ))}
      </div>

      {isCurrentStepLocked ? (
        <p>Complete the previous step to unlock this one.</p>
      ) : (
        <ProjectStep
          key={currentStepData.id}
          step={currentStepData}
          code={stepCode[viewingStep] ?? currentStepData.starter_code ?? ""}
          onCodeChange={handleCodeChange}
          previewDoc={previewDoc}
          isCompleted={completedSteps.includes(viewingStep)}
          pyodide={pyodide}
          pyodideReady={pyodideReady}
          onComplete={() => handleStepComplete(viewingStep)}
          onNext={() => setViewingStep((v) => Math.min(v + 1, steps.length))}
          isLastStep={viewingStep === steps.length}
        />
      )}
    </div>
  );
}