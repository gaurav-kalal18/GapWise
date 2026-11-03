import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import GapWiseProvider from "./context/GapWiseProvider";

import "./styles/variables.css";
import "./styles/global.css";
import "./styles/animations.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GapWiseProvider>
      <App />
    </GapWiseProvider>
  </React.StrictMode>
);