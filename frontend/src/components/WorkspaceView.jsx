// ============================================
// FILE: src/components/WorkspaceView.jsx
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
import PhotoStudio from "./PhotoAiEditor";
import PhotoTemplatesPanel from "./PhotoTemplatesPanel";
import PhotosGrid from "./PhotosGrid";
import { syncWbMedia } from "../api/wbMediaApi";
import { updateWbCards } from "../api/wbCardsApi";

import { message } from "antd";

import { api } from "../api/client";

export default function WorkspaceView({ token, username, onLogout }) {
  // Qaysi sahifa: asosiy ("main") yoki Raski page ("raski")
  const [activeView, setActiveView] = useState("main");

  const [cardPhotos, setCardPhotos] = useState([]);
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");

  const [processingCurrent, setProcessingCurrent] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [cardVideo, setCardVideo] = useState(null);

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

  // PHOTO STUDIO (AI modal – WB kartochka uchun)
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
      setCardVideo(data.card.video || null);

      const photosFromCard = (data.card?.photos || [])
        .map((p) => ({
          photoId: p.photoId,
          url: p.big || p.hq || p.square || p.c516x688 || p.c246x328,
          isNew: false,
        }))
        .filter((p) => p.url);

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

  async function savePhotoOrderToWB(updatedPhotos) {
    try {
      pushLog("🔄 Сохранение порядка фото в WB...");

      // WBdagi eski rasmlar (isNew=false) tartibi bo‘yicha faqat URL + order
      const photosOrder = updatedPhotos
        .filter((p) => !p.isNew && p.url)
        .map((p, index) => ({
          url: p.url,
          order: index + 1,
        }));

      await syncWbMedia(token, card.nmID, photosOrder, []); // yangi rasm yo‘q

      pushLog("✔ Порядок фото обновлён в WB");
      message.success("Порядок фото успешно обновлён в WB");
    } catch (err) {
      console.error(err);
      message.error(err.message);
      pushLog("❌ Ошибка: " + err.message);
    }
  }

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
        name in finalCharValues ? finalCharValues[name] : base?.value ?? [];

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

  async function handleSendToWB() {
    try {
      setProcessing(true);
      pushLog("📤 Отправка данных в WB...");

      if (!finalData) throw new Error("Нет данных для отправки");

      // 1) CARD UPDATE
      await updateWbCards(token, [
        {
          nmID: finalData.nmID,
          vendorCode: card.vendorCode,
          brand: finalData.brand,
          title: finalData.title,
          description: finalData.description,
          dimensions: card.dimensions,
          characteristics: finalData.characteristics,
          sizes: card.sizes,
        },
      ]);

      pushLog("✔️ Карточка обновлена");

      // 2) NEW FILES (AI studiyadan kelganlar)
      const newFiles = cardPhotos
        .filter((p) => p.isNew && p.file)
        .map((p) => p.file);

      // 3) TARTIB – eski rasmlar URLlari bo‘yicha
      const photosOrder = cardPhotos
        .filter((p) => !p.isNew && p.url)
        .map((p, index) => ({
          url: p.url,
          order: index + 1,
        }));

      await syncWbMedia(token, card.nmID, photosOrder, newFiles);

      pushLog("✔️ Фото синхронизированы");
      message.success("Карточка + фото успешно отправлены в WB");
    } catch (err) {
      console.error(err);
      pushLog(`❌ Ошибка: ${err.message}`);
      message.error(err.message);
    } finally {
      setProcessing(false);
    }
  }

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
  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((f) => ({
      photoId: null,
      url: URL.createObjectURL(f),
      file: f,
      isNew: true,
    }));

    setCardPhotos((prev) => [...prev, ...newItems]);

    e.target.value = "";
  };

  // HEADERDAGI RASKI – yangi PAGE
  const handleOpenRaskiPage = () => {
    setActiveView("raski");
  };

  const handleCloseRaskiPage = () => {
    setActiveView("main");
  };

  const handleUpdateCardPhotos = (newPhotos) => {
    setCardPhotos(newPhotos);
  };

  // ---- RASKI PAGE BRANCH ----
  if (activeView === "raski") {
    return (
      <div className="min-h-screen bg-gray-100">
        <HeaderBar
          username={username}
          onLogout={onLogout}
          onOpenPrompts={handleOpenPrompts}
          onOpenPhotoSettings={handleOpenPhotoTemplates}
          // Raski sahifasida RASKI tugmasi ko‘rinmasin – undefined
          onOpenPhotoStudio={undefined}
          onDownloadExcel={handleDownloadExcel}
        />

        <main className="max-w-[1800px] mx-auto px-6 py-6">
          {/* Yangi RASKI sahifasi – faqat AI studiýa, kartochka chap panelisiz */}
          <PhotoStudio
            token={token}
            cardPhotos={cardPhotos}
            onUpdateCardPhotos={handleUpdateCardPhotos}
            onClose={handleCloseRaskiPage}
            mode="page"
            showCardColumn={false}
          />
        </main>

        {/* PROMPTS & TEMPLATES ham ishlayversin */}
        <PromptsPanel
          open={promptsOpen}
          onClose={handleClosePrompts}
          token={token}
        />
        <PhotoTemplatesPanel
          open={photoTemplatesOpen}
          onClose={handleClosePhotoTemplates}
          token={token}
        />
      </div>
    );
  }

  // ---- ASOSIY (WB KARTOCHKA) BRANCH ----
  return (
    <div className="min-h-screen bg-gray-100">
      <HeaderBar
        username={username}
        onLogout={onLogout}
        onOpenPrompts={handleOpenPrompts}
        onOpenPhotoSettings={handleOpenPhotoTemplates}
        // Bu yerda RASKI tugmasi yangi page’ni ochadi
        onOpenPhotoStudio={handleOpenRaskiPage}
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
              photos={cardPhotos}
              videoUrl={cardVideo}
              onGenerate={() => setPhotoStudioOpen(true)} // WB kartochka uchun eski modal
              onReorder={(newOrder) => setCardPhotos(newOrder)}
              onSaveOrder={savePhotoOrderToWB}
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
                onSubmit={handleSendToWB}
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

      {/* PHOTO AI EDITOR MODAL – WB kartochka uchun eski variant */}
      {photoStudioOpen && (
        <PhotoStudio
          token={token}
          cardPhotos={cardPhotos}
          onUpdateCardPhotos={handleUpdateCardPhotos}
          onClose={() => setPhotoStudioOpen(false)}
          // bu yerda default: mode="modal", showCardColumn=true
        />
      )}
    </div>
  );
}
