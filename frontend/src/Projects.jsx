import { useEffect, useState } from "react";
import { fetchProjects } from "./api";
import ProjectView from "./ProjectView";

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
  <div className="projects-page">
    <button className="another-topic-button" onClick={onBack}>
      ← Back
    </button>

      <h1>Projects</h1>
      <p>Build real projects while practicing what you've learned.</p>

      <div className="projects-grid">
        {projects.map((project) => (
          <div className="project-card" key={project.id}>
            <h2>{project.title}</h2>

            <p>{project.description}</p>

            <p>
              <strong>Topic:</strong> {project.topic}
            </p>

            <p>
              <strong>Difficulty:</strong> {project.difficulty}
            </p>

            <button
              className="run-code-button"
              onClick={() => setSelectedProject(project)}
            >
              Start Project
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}