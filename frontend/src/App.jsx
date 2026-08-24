import { useState, useRef } from "react";
import Quiz from "./Quiz";
import History from "./History";
import Study from "./Study.jsx";
import Projects from "./Projects.jsx";
import Auth from "./Auth.jsx";
import Footer from "./Footer.jsx";
import BackButton from "./BackButton.jsx";
import { isLoggedIn, getUsername, logout as apiLogout } from "./api";

function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [username, setUsername] = useState(getUsername());
const [view, setView] = useState("quiz");
  const [quizAtHome, setQuizAtHome] = useState(true);
  const quizRef = useRef(null);

  function handleAuthed(name) {
    setLoggedIn(true);
    setUsername(name);
  }

  function handleLogout() {
    apiLogout();
    setLoggedIn(false);
    setUsername(null);
    setView("quiz");
  }

  if (!loggedIn) {
    return <Auth onAuthed={handleAuthed} />;
  }

  function handleBack() {
    if (view === "quiz") {
      quizRef.current?.goHome();
    } else {
      setView("quiz");
    }
  }

  function handlePracticeTopic(topic) {
  setView("quiz");

  setTimeout(() => {
    quizRef.current?.startTopic(topic);
  }, 0);
}

  const showBack = view !== "quiz" || !quizAtHome;

let content;

if (view === "history") {
  content = <History onBack={() => setView("quiz")} />;

} else if (view === "study") {
  content = (
    <Study
      onBack={() => setView("quiz")}
      onPracticeTopic={handlePracticeTopic}
    />
  );

} else if (view === "projects") {
  content = (
    <Projects
      onBack={() => setView("quiz")}
    />
  );

} else {
  content = (
    <Quiz
      ref={quizRef}
      onShowHistory={() => setView("history")}
      onshowStudy={() => setView("study")}
      onShowProjects={() => setView("projects")}
      onHomeChange={setQuizAtHome}
    />
  );
}


  return (
    <div className="app-shell">
      <BackButton visible={showBack} onClick={handleBack} />
      <main>{content}</main>
      <Footer username={username} onLogout={handleLogout} />
    </div>
  );
}

export default App;