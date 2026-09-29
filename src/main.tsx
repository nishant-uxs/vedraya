import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { ThemeProvider } from "./lib/ThemeProvider.tsx";
import { AuthProvider } from "./lib/AuthProvider.tsx";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
