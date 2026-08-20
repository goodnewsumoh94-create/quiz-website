import { useState } from "react";

function DebuggingChallenge({ question, onComplete }) {
    const [code, setCode] = useState(question.solution_code || "");
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState("");

    const runCode = () => {
        setStatus("");
        setOutput("");

        // For now, we don't execute arbitrary code in the browser.
        // We compare the submitted code against the expected solution.
        if (code.trim() === question.solution_code.trim()) {
            setOutput(question.expected_output);
            setStatus("correct");
        } else {
            setOutput("The code still has a bug. Keep debugging!");
            setStatus("incorrect");
        }
    };

    const submitCode = () => {
        if (code.trim() === question.solution_code.trim()) {
            setOutput(question.expected_output);
            setStatus("correct");

            if (onComplete) {
                onComplete(true);
            }
        } else {
            setOutput("Not quite. Find and fix the bug first.");
            setStatus("incorrect");

            if (onComplete) {
                onComplete(false);
            }
        }
    };

    return (
        <div className="debugging-challenge">

            <h2>🐛 Debug This Code</h2>

            <p className="question-text">
                {question.question_text}
            </p>

            <div className="code-editor">
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck="false"
                    rows={18}
                />
            </div>

            <div className="debug-buttons">
                <button onClick={runCode}>
                    ▶ Run Code
                </button>

                <button onClick={submitCode}>
                    ✓ Submit Solution
                </button>
            </div>

            {output && (
                <div className={`debug-output ${status}`}>
                    <h3>Output</h3>
                    <pre>{output}</pre>

                    {status === "correct" && (
                        <p>🎉 Correct! You fixed the bug!</p>
                    )}

                    {status === "incorrect" && (
                        <p>🐛 There's still a problem. Keep debugging!</p>
                    )}
                </div>
            )}

        </div>
    );
}

export default DebuggingChallenge;