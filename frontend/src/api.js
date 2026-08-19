const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function fetchQuestions() {
  const response = await fetch(`${API_URL}/api/questions`);
  const data = await response.json();
  return data;
}

export async function submitAnswer(questionId, userAnswer) {
  const response = await fetch(`${API_URL}/api/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, user_answer: userAnswer })
  });
  const data = await response.json();
  return data;
}

export async function fetchHistory() {
  const response = await fetch(`${API_URL}/api/history`);
  const data = await response.json();
  return data;
}

export async function fetchStudyContent(){
  const response = await fetch(`${API_URL}/api/study`);
  const data = await response.json();
  return data;
}