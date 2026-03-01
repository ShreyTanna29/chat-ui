import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { SharedChatPage } from "@/components/SharedChatPage";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { PreviewPage } from "@/components/PreviewPage";
import { AuthProvider } from "@/contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/shared/:shareId" element={<SharedChatPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/preview/:slug" element={<PreviewPage />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
