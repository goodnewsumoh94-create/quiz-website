// App.jsx
import { useState } from "react";
import Quiz from "./Quiz";
import History from "./History";
import Study from "./Study.jsx";

function App() {
  const [view, setView] = useState("quiz");

  if (view === "history") {
    return <History onBack={() => setView("quiz")} />;
  }

  if (view === "study") {
    return <Study onBack={() => setView("quiz")} />;
  }

  return <Quiz onShowHistory={() => setView("history")} onshowStudy={() => setView("study")}/>;
}

export default App;