// src/App.jsx

import { useState } from "react";
import LoginView from "./components/LoginView";
import WorkspaceView from "./components/WorkspaceView";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("wb_token") || "");
  const [username, setUsername] = useState(
    localStorage.getItem("wb_username") || ""
  );

  if (!token) {
    return (
      <LoginView
        onSuccess={({ token: t, username: u }) => {
          setToken(t);
          setUsername(u);
        }}
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("wb_token");
    localStorage.removeItem("wb_username");
    setToken("");
    setUsername("");
  };

  return (
    <WorkspaceView
      token={token}
      username={username}
      onLogout={handleLogout}
    />
  );
}
