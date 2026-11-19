
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import MyReports from "./pages/MyReports";
import Workspace from "./pages/Workspace";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import UploadResume from "./pages/UploadResume";
import TargetRole from "./pages/TargetRole";
import ResultsPlaceholder from "./pages/ResultsPlaceholder";
import AuthPage from "./pages/AuthPage";
import SavedReportView from "./pages/SavedReportView";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/signup"
          element={<AuthPage mode="signup" />}
        />

        <Route
  path="/reports/:id/view"
  element={
    <ProtectedRoute>
      <SavedReportView />
    </ProtectedRoute>
  }
/>

        <Route
  path="/reports"
  element={
    <ProtectedRoute>
      <MyReports />
    </ProtectedRoute>
  }
/>

        <Route
  path="/workspace"
  element={
    <ProtectedRoute>
      <Workspace />
    </ProtectedRoute>
  }
/>

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