export async function fetchQuestions() {
  const response = await fetch("http://localhost:5000/api/questions");
  const data = await response.json();
  return data;
}

export async function submitAnswer(questionId, userAnswer) {
  const response = await fetch("http://localhost:5000/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, user_answer: userAnswer })
  });
  const data = await response.json();
  return data;
}

export async function fetchHistory() {
  const response = await fetch("http://localhost:5000/api/history");
  const data = await response.json();
  return data;
}

export async function fetchStudyContent(){
  const response = await fetch("http://localhost:5000/api/study");
  const data = await response.json();
  return data;
}