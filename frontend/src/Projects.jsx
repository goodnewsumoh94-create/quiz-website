import { useEffect, useState } from "react";
import { fetchProjects } from "./api";
import ProjectView from "./Projectview.jsx";
import "./Quiz.css";

export default function Projects({ onBack, pyodide, pyodideReady }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (selectedProject) {
    return (
      <ProjectView
        project={selectedProject}
        pyodide={pyodide}
        pyodideReady={pyodideReady}
        onExit={() => setSelectedProject(null)}
      />
    );
  }

  if (loading) {
    return <p>Loading projects...</p>;
  }

  return (
    <div className="home-card">
      <button className="another-topic-button" onClick={onBack}>
        ← Back
      </button>

      <h1>🛠️ Projects</h1>

      <p className="home-subtitle">
        Build real projects step by step and put your coding skills into practice.
      </p>

      <div className="topic-grid">
        {projects.map((project) => (
          <button
            key={project.id}
            className="topic-button"
            onClick={() => setSelectedProject(project)}
          >
            <strong>{project.title}</strong>
            <br />
            <small>
              {project.topic} · {project.difficulty}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}