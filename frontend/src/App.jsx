
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Landing from "./pages/Landing";
import UploadResume from "./pages/UploadResume";
import TargetRole from "./pages/TargetRole";
import ResultsPlaceholder from "./pages/ResultsPlaceholder";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<UploadResume />} />
        <Route path="/job" element={<TargetRole />} />
        <Route
          path="/results"
          element={<ResultsPlaceholder />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
