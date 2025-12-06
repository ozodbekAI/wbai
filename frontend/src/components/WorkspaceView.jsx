// ============================================
// FILE 3: src/components/WorkspaceView.jsx
// COMPLETE VERSION - Copy this entire file
// ============================================

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";

import HeaderBar from "./HeaderBar";
import SearchPanel from "./SearchPanel";
import CurrentCardPanel from "./CurrentCardPanel";

import CompareTitle from "./CompareTitle";
import CompareDescription from "./CompareDescription";
import CompareCharacteristics from "./CompareCharacteristics";
import StatsCards from "./StatsCards";
import LogsPanel from "./LogsPanel";
import FinalPanel from "./FinalPanel";
import HistorySidebar from "./HistorySidebar";
import PromptsPanel from "./PromptsPanel";
import ValidationIssuesPanel from "./ValidationIssuesPanel";
import PhotoAiEditor from "./PhotoAiEditor";
import PhotoTemplatesPanel from "./PhotoTemplatesPanel";
import PhotosGrid from "./PhotosGrid";

import { api } from "../api/client";

export default function WorkspaceView({ token, username, onLogout }) {
  const [cardPhotos, setCardPhotos] = useState([]);
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");

  const [processingCurrent, setProcessingCurrent] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [card, setCard] = useState(null);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const [currentValidation, setCurrentValidation] = useState(null);

  const [finalTitle, setFinalTitle] = useState("");
  const [finalDescription, setFinalDescription] = useState("");
  const [finalCharValues, setFinalCharValues] = useState({});

  // HISTORY
  const [historyItems, setHistoryItems] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // PROMPTS / PHOTO TEMPLATES
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [photoTemplatesOpen, setPhotoTemplatesOpen] = useState(false);

  // PHOTO STUDIO (AI modal)
  const [photoStudioOpen, setPhotoStudioOpen] = useState(false);
  const fileInputRef = useRef(null);

  const pushLog = (msg) => {
    setLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString("ru-RU"),
        msg,
      },
    ]);
  };

  const resetForNewRun = () => {
    setResult(null);
    setLogs([]);
    setFinalTitle("");
    setFinalDescription("");
    setFinalCharValues({});
  };

  /** current_card olish */
  const handleStart = async () => {
    if (!article.trim()) return;
    setError("");
    setProcessingCurrent(true);
    resetForNewRun();
    setCard(null);
    setCurrentValidation(null);
    setCardPhotos([]);

    try {
      const art = article.trim();
      pushLog(`Запрос текущей карточки для: ${art}`);

      const data = await api.getCurrentCard(token, { article: art });

      if (data.status !== "ok") {
        throw new Error(data.message || "Не удалось получить карточку");
      }

      setCard(data.card);
      setCurrentValidation(data.response || null);

      // Photos dan URLlarni to'g'ri olish
      const photosFromCard = (data.card?.photos || [])
        .map((p) => p.big || p.hq || p.square || p.c246x328 || p.c516x688 || p)
        .filter(Boolean);
      setCardPhotos(photosFromCard);

      pushLog("Текущая карточка WB получена");
    } catch (e) {
      setError(e.message);
      pushLog(`❌ Ошибка получения карточки: ${e.message}`);
    } finally {
      setProcessingCurrent(false);
    }
  };

  const handleClearError = () => setError("");
  const handleCancelCurrent = () => {
    setProcessingCurrent(false);
  };

  /** final inicializatsiya */
  const initFinalFromResult = (cardData, res) => {
    const oldTitle = res.old_title || cardData?.title || "";
    const newTitle = res.new_title || oldTitle;
    const oldDesc = res.old_description || cardData?.description || "";
    const newDesc = res.new_description || oldDesc;

    setFinalTitle(newTitle);
    setFinalDescription(newDesc);

    const fv = {};
    (res.new_characteristics || []).forEach((c) => {
      fv[c.name] = Array.isArray(c.value)
        ? c.value
        : [c.value].filter(Boolean);
    });

    (cardData.characteristics || []).forEach((c) => {
      if (!fv[c.name]) {
        fv[c.name] = Array.isArray(c.value)
          ? c.value
          : [c.value].filter(Boolean);
      }
    });

    setFinalCharValues(fv);
  };

  /** /api/process – AI generatsiya */
  const handleGenerate = async () => {
    if (!article.trim() || !card) return;
    setProcessing(true);
    setError("");
    setLogs([]);
    setResult(null);

    try {
      const art = article.trim();
      pushLog("Запуск AI обработки…");

      const res = await api.process({ article: art }, token);
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let msg = `Request failed with status ${res.status}`;
        try {
          if (contentType.includes("application/json")) {
            const errJson = await res.json();
            msg = errJson.detail || errJson.message || msg;
          } else {
            const errText = await res.text();
            if (errText) msg = errText;
          }
        } catch (_) {}
        throw new Error(msg);
      }

      if (contentType.includes("text/event-stream")) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let lastCandidate = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            const line = block.trim();
            if (!line) continue;

            const dataLine = line
              .split("\n")
              .find((ln) => ln.startsWith("data:"));

            if (!dataLine) continue;

            let jsonStr = dataLine.replace(/^data:\s*/, "");
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const evt = JSON.parse(jsonStr);

              if (
                evt.type === "log" ||
                evt.type === "card_log" ||
                evt.type === "batch_log"
              ) {
                const text =
                  evt.message || evt.msg || evt.text || JSON.stringify(evt);
                pushLog(text);
                continue;
              }

              let candidate = null;

              if (evt.type === "result" && evt.payload) {
                candidate = evt.payload;
              } else if (
                evt.type === "batch_completed" &&
                evt.results &&
                Array.isArray(evt.results.cards) &&
                evt.results.cards.length > 0
              ) {
                candidate = evt.results.cards[0];
              } else if (!evt.type) {
                candidate = evt;
              }

              if (
                candidate &&
                (candidate.new_title ||
                  candidate.new_description ||
                  candidate.new_characteristics ||
                  typeof candidate.validation_score !== "undefined")
              ) {
                lastCandidate = candidate;
                setResult(candidate);
                initFinalFromResult(card, candidate);
              }
            } catch (err) {
              console.error("Failed to parse SSE data chunk:", err, jsonStr);
              pushLog(`⚠️ Ошибка парсинга SSE: ${String(err)}`);
            }
          }
        }

        if (!lastCandidate) {
          throw new Error(
            "Пустой ответ от сервера (нет финального результата)"
          );
        }

        pushLog("AI обработка завершена (SSE)");
      } else {
        const parsed = await res.json();
        setResult(parsed);
        pushLog("AI обработка завершена");
        initFinalFromResult(card, parsed);
      }
    } catch (e) {
      setError(e.message);
      pushLog(`❌ Ошибка AI: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelGenerate = () => {
    setProcessing(false);
    pushLog("⏹ Обработка остановлена пользователем");
  };

  /** Final characteristics uchun update */
  const handleChangeFinalChar = (name, value) => {
    setFinalCharValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /** Final JSON tayyorlash */
  const finalData = useMemo(() => {
    if (!card || !result) return null;

    const oldChars = card.characteristics || [];
    const newChars = result.new_characteristics || [];

    const allNames = Array.from(
      new Set([...oldChars.map((c) => c.name), ...newChars.map((c) => c.name)])
    );

    const finalChars = allNames.map((name) => {
      const fromNew = newChars.find((c) => c.name === name);
      const fromOld = oldChars.find((c) => c.name === name);
      const base = fromNew || fromOld;

      let rawVal =
        name in finalCharValues
          ? finalCharValues[name]
          : base?.value ?? [];

      const arr = Array.isArray(rawVal)
        ? rawVal
        : String(rawVal || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);

      return {
        id: base?.id,
        name,
        value: arr,
      };
    });

    return {
      nmID: card.nmID,
      brand: card.brand,
      subjectID: card.subjectID,
      subjectName: card.subjectName,
      title: (finalTitle || "").trim(),
      description: (finalDescription || "").trim(),
      characteristics: finalChars,
      validation_score: result.validation_score,
    };
  }, [card, result, finalTitle, finalDescription, finalCharValues]);

  const handleSubmitToWB = () => {
    if (!finalData) return;
    pushLog("📤 Отправка финальных данных в WB (пока только console.log)");
    console.log("WB payload:", finalData);
  };

  const handleDownloadJson = () => {
    if (!finalData) return;
    const blob = new Blob([JSON.stringify(finalData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wb_${article || card?.nmID || "card"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const combinedValidation = result
    ? { messages: result.validation_issues || [], stats: result.validation_stats }
    : currentValidation;

  const handleDownloadExcel = () => {
    console.log("Download Excel for:", article || card?.nmID);
  };

  /** HISTORY – API'dan olish */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.history.list(token, { limit: 50, offset: 0 }),
        api.history.stats(token, { days: 30 }),
      ]);

      setHistoryItems(listRes.items || listRes || []);
      setHistoryStats(statsRes || null);
    } catch (err) {
      console.error("Failed to load history", err);
      pushLog(`⚠️ Ошибка загрузки истории: ${String(err.message || err)}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenPrompts = () => setPromptsOpen(true);
  const handleClosePrompts = () => setPromptsOpen(false);

  const handleOpenPhotoTemplates = () => setPhotoTemplatesOpen(true);
  const handleClosePhotoTemplates = () => setPhotoTemplatesOpen(false);

  /** PhotosGrid uchun handlerlar */
  const handleOpenUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newUrls = files.map((f) => URL.createObjectURL(f));
    setCardPhotos((prev) => [...prev, ...newUrls]);

    e.target.value = "";
  };

  const handleReorderPhotos = (newOrder) => {
    setCardPhotos(newOrder);
  };

  const handleSavePhotosOrder = (newOrder) => {
    console.log("Save photo order:", newOrder);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <HeaderBar
        username={username}
        onLogout={onLogout}
        onOpenPrompts={handleOpenPrompts}
        onOpenPhotoSettings={handleOpenPhotoTemplates}
        onDownloadExcel={handleDownloadExcel}
      />

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr,0.8fr] gap-6">
          {/* LEFT MAIN COLUMN */}
          <div className="space-y-6">
            <SearchPanel
              article={article}
              setArticle={setArticle}
              onStart={handleStart}
              processing={processingCurrent}
              error={error}
              onClearError={handleClearError}
              onCancel={handleCancelCurrent}
            />

            <StatsCards result={result} processing={processing} />

            <CurrentCardPanel
              card={card}
              validation={combinedValidation}
              editableTitle={card?.title || ""}
              onChangeTitle={() => {}}
              editableDescription={card?.description || ""}
              onChangeDescription={() => {}}
              onGenerate={processing ? handleCancelGenerate : handleGenerate}
              processingGenerate={processing}
            />

            {/* PHOTOS GRID */}
            <PhotosGrid
              urls={cardPhotos}
              onGenerate={() => setPhotoStudioOpen(true)}
              onReorder={handleReorderPhotos}
              onSaveOrder={handleSavePhotosOrder}
              onUploadClick={handleOpenUpload}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesChange}
            />

            {card && result && (
              <>
                <CompareTitle
                  oldTitle={card.title}
                  newTitle={result.new_title}
                  finalTitle={finalTitle}
                  onChangeFinalTitle={setFinalTitle}
                  meta={result.meta || result}
                />

                <CompareDescription
                  oldDesc={card.description}
                  newDesc={result.new_description}
                  finalDesc={finalDescription}
                  onChangeFinalDesc={setFinalDescription}
                  meta={result.meta || result}
                />

                <CompareCharacteristics
                  oldChars={card.characteristics || []}
                  newChars={result.new_characteristics || []}
                  finalValues={finalCharValues}
                  onChangeFinalValue={handleChangeFinalChar}
                  token={token}
                />
              </>
            )}

            <LogsPanel logs={logs} />

            {result && finalData && (
              <FinalPanel
                article={article || card?.nmID}
                result={result}
                finalData={finalData}
                onSubmit={handleSubmitToWB}
                onDownload={handleDownloadJson}
              />
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4">
            <ValidationIssuesPanel validation={combinedValidation} />

            <HistorySidebar
              historyItems={historyItems}
              loading={historyLoading}
              stats={historyStats}
              onRefresh={loadHistory}
            />
          </div>
        </div>
      </main>

      {/* PROMPTS ADMIN PANEL */}
      <PromptsPanel
        open={promptsOpen}
        onClose={handleClosePrompts}
        token={token}
      />

      {/* PHOTO TEMPLATES ADMIN PANEL */}
      <PhotoTemplatesPanel
        open={photoTemplatesOpen}
        onClose={handleClosePhotoTemplates}
        token={token}
      />

      {/* PHOTO AI EDITOR MODAL */}
      {photoStudioOpen && cardPhotos.length > 0 && (
        <PhotoAiEditor
          token={token}
          urls={cardPhotos}
          onAddPhoto={(newUrl) => setCardPhotos((prev) => [...prev, newUrl])}
          onClose={() => setPhotoStudioOpen(false)}
        />
      )}
    </div>
  );
}