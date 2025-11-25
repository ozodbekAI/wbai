import { useMemo, useState } from "react";
import LoginView from "./components/LoginView";
import HeaderBar from "./components/HeaderBar";
import SearchPanel from "./components/SearchPanel";
import HistorySidebar from "./components/HistorySidebar";
import StatsCards from "./components/StatsCards";
import CompareTitle from "./components/CompareTitle";
import CompareDescription from "./components/CompareDescription";
import CompareCharacteristics from "./components/CompareCharacteristics";
import PhotosGrid from "./components/PhotosGrid";
import FinalPanel from "./components/FinalPanel";
import LogsPanel from "./components/LogsPanel";
import PromptsPanel from "./components/prompts/PromptsPanel";
import { useSSEProcess } from "./hooks/useSSEProcess";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("wb_token") || "");
  const [username, setUsername] = useState(localStorage.getItem("wb_username") || "");
  const [article, setArticle] = useState("");

  const [sessions, setSessions] = useState([]); // {id, article, time, status, result, logs, validation_score}
  const [activeId, setActiveId] = useState(null);

  const [showPrompts, setShowPrompts] = useState(false);

  // selection per active session
  const [selectedTitle, setSelectedTitle] = useState("new");
  const [selectedDescription, setSelectedDescription] = useState("new");
  const [selectedChars, setSelectedChars] = useState({});

  const { processing, logs, result, error, start, cancel, reset, setResult } = useSSEProcess(token);

  const activeSession = sessions.find(s => s.id === activeId) || null;

  const onLoginSuccess = ({ token, username }) => {
    setToken(token);
    setUsername(username);
  };

  const onLogout = () => {
    setToken("");
    setUsername("");
    localStorage.removeItem("wb_token");
    localStorage.removeItem("wb_username");
    setSessions([]);
    setActiveId(null);
    reset();
  };

  const initSelections = (payload) => {
    setSelectedTitle("new");
    setSelectedDescription("new");
    const map = {};
    (payload?.new_characteristics || []).forEach(c => map[c.name] = "new");
    setSelectedChars(map);
  };

  const onStart = async () => {
    const id = crypto.randomUUID();
    const time = new Date().toLocaleString();

    setSessions(prev => [
      { id, article: article.trim(), time, status: "processing", result: null, logs: [], validation_score: null },
      ...prev,
    ]);
    setActiveId(id);

    const payload = await start(article.trim());
    if (payload) {
      initSelections(payload);
      setSessions(prev => prev.map(s => s.id === id ? {
        ...s,
        status: "done",
        result: payload,
        logs,
        validation_score: payload.validation_score,
      } : s));
    } else {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: "error", logs } : s));
    }
  };

  const onSelectSession = (id) => {
    setActiveId(id);
    const s = sessions.find(x => x.id === id);
    if (s?.result) {
      setResult(s.result);       // show in main area
      initSelections(s.result);  // reset selections for that session by default
    } else {
      setResult(null);
      reset();
    }
  };

  const clearHistory = () => {
    setSessions([]);
    setActiveId(null);
    reset();
  };

  const finalData = useMemo(() => {
    if (!result) return null;

    const finalChars = [];
    (result.new_characteristics || []).forEach(newChar => {
      const sel = selectedChars[newChar.name] || "new";
      if (sel === "new") finalChars.push(newChar);
      else {
        const oldChar = result.old_characteristics?.find(c => c.name === newChar.name);
        finalChars.push(oldChar || newChar);
      }
    });

    return {
      nmID: result.nmID,
      subjectID: result.subjectID,
      title: selectedTitle === "new" ? result.new_title : result.old_title,
      description: selectedDescription === "new" ? result.new_description : result.old_description,
      characteristics: finalChars,
      validation_score: result.validation_score,
      article,
    };
  }, [result, selectedChars, selectedTitle, selectedDescription, article]);

  const onSubmitWB = () => {
    console.log("Final WB payload:", finalData);
    alert("Payload готов. Смотри консоль. Дальше подключим endpoint отправки.");
  };

  const onDownloadJSON = () => {
    if (!finalData) return;
    const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wb_${article}_final_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!token) return <LoginView onSuccess={onLoginSuccess} />;

  if (showPrompts) return <PromptsPanel token={token} onClose={() => setShowPrompts(false)} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <HeaderBar username={username} onLogout={onLogout} onOpenPrompts={() => setShowPrompts(true)} />

      <main className="max-w-[1800px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <HistorySidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={onSelectSession}
          onClear={clearHistory}
        />

        <div className="space-y-6">
          <SearchPanel
            article={article}
            setArticle={setArticle}
            onStart={onStart}
            processing={processing}
            error={error}
            onClearError={() => reset()}
            onCancel={cancel}
          />

          <StatsCards result={result} processing={processing} />

          <LogsPanel logs={activeSession?.logs || logs} />

          {result && (
            <div className="space-y-6">
              <CompareTitle
                oldTitle={result.old_title}
                newTitle={result.new_title}
                selected={selectedTitle}
                onSelect={setSelectedTitle}
                meta={{ title_score: result.title_score, title_attempts: result.title_attempts }}
              />

              <CompareDescription
                oldDesc={result.old_description}
                newDesc={result.new_description}
                selected={selectedDescription}
                onSelect={setSelectedDescription}
                meta={{
                  description_score: result.description_score,
                  description_attempts: result.description_attempts,
                  description_warnings: result.description_warnings,
                }}
              />

              <CompareCharacteristics
                newChars={result.new_characteristics}
                oldChars={result.old_characteristics}
                selectedMap={selectedChars}
                onSelectChar={(name, v) => setSelectedChars(p => ({ ...p, [name]: v }))}
              />

              <PhotosGrid urls={result.photo_urls} />

              <FinalPanel
                article={article}
                result={result}
                finalData={finalData}
                onSubmit={onSubmitWB}
                onDownload={onDownloadJSON}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
