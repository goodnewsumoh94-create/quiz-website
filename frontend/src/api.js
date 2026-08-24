const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function signup(username, password) {
  const response = await fetch(`${API_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Signup failed");
  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.username);
  return data;
}

export async function login(username, password) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed");
  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.username);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

export function getUsername() {
  return localStorage.getItem("username");
}

export async function fetchQuestions() {
  const response = await fetch(`${API_URL}/api/questions`);
  return response.json();
}

export async function submitAnswer(questionId, userAnswer) {
  const response = await fetch(`${API_URL}/api/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question_id: questionId, user_answer: userAnswer })
  });
  return response.json();
}

export async function fetchHistory() {
  const response = await fetch(`${API_URL}/api/history`, {
    headers: { ...authHeaders() }
  });
  return response.json();
}

export async function fetchStudyContent() {
  const response = await fetch(`${API_URL}/api/study`);
  return response.json();
}


// Add these to api.js

function requireAuth() {
  if (!localStorage.getItem("token")) {
    throw new Error("You need to be logged in to do that.");
  }
}

export async function fetchProjects() {
  const response = await fetch(`${API_URL}/api/projects`);
  return response.json();
}

export async function fetchProjectSteps(projectId) {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/steps`);
  return response.json();
}

export async function fetchProjectProgress(projectId) {
  requireAuth();
  const response = await fetch(`${API_URL}/api/project-progress/${projectId}`, {
    headers: { ...authHeaders() }
  });
  return response.json();
}

export async function saveProjectProgress(projectId, stepNumber) {
  requireAuth();
  const response = await fetch(`${API_URL}/api/project-progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ project_id: projectId, step_number: stepNumber })
  });
  return response.json();
}

