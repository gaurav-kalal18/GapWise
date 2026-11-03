import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import UploadResume from "./pages/UploadResume";

function Job() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Target Role</h1>
      <p>Your resume was successfully analyzed.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/upload"
          element={<UploadResume />}
        />

        <Route
          path="/job"
          element={<Job />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;