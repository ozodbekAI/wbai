// src/WorkspaceView.jsx

import { useState, useMemo } from "react";

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

import { api } from "../api/client";

export default function WorkspaceView({ token, username, onLogout }) {
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");

  const [processingCurrent, setProcessingCurrent] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [card, setCard] = useState(null); // текущая карточка WB
  const [result, setResult] = useState(null); // AI natijasi
  const [logs, setLogs] = useState([]); // [{time, msg}, ...]

  // CURRENT CARD validatsiya (validation_card dan kelgan)
  const [currentValidation, setCurrentValidation] = useState(null);

  // Final editable state
  const [finalTitle, setFinalTitle] = useState("");
  const [finalDescription, setFinalDescription] = useState("");
  const [finalCharValues, setFinalCharValues] = useState({}); // { [name]: string[] }

  // History
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

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

    try {
      pushLog(`Запрос текущей карточки для: ${article.trim()}`);
      const data = await api.getCurrentCard(token, {
        article: article.trim(),
      });

      if (data.status !== "ok") {
        throw new Error(data.message || "Не удалось получить карточку");
      }

      setCard(data.card);
      setCurrentValidation(data.response || null); // 🔥 validation_card natijalari
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

    // Agar AI’da yo‘q, lekin eski kartochkada bo‘lsa – fallback
    (cardData.characteristics || []).forEach((c) => {
      if (!fv[c.name]) {
        fv[c.name] = Array.isArray(c.value)
          ? c.value
          : [c.value].filter(Boolean);
      }
    });

    setFinalCharValues(fv);
  };

  /** /api/process – AI generatsiya (SSE + oddiy JSON qo'llab-quvvatlanadi) */
  const handleGenerate = async () => {
    if (!article.trim() || !card) return;
    setProcessing(true);
    setError("");
    setLogs([]);
    setResult(null);

    try {
      pushLog("Запуск AI обработки…");
      const res = await api.process({ article: article.trim() }, token);

      const contentType = res.headers.get("content-type") || "";

      // ❗ Avval HTTP xatoni tekshiramiz
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
        } catch (_) {
          // ignore
        }
        throw new Error(msg);
      }

      // 1) SSE – text/event-stream bo'lsa
      if (contentType.includes("text/event-stream")) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        // Oxirgi muvaffaqiyatli natijani saqlab boramiz
        let lastCandidate = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE bloklarini ajratamiz: har bir event "\n\n" bilan tugaydi
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || ""; // oxirgi bo'lak to'liq bo'lmasligi mumkin

          for (const block of blocks) {
            const line = block.trim();
            if (!line) continue;

            // Serverdan faqat bitta "data: {...}" qator keladi deb faraz qilamiz
            const dataLine = line
              .split("\n")
              .find((ln) => ln.startsWith("data:"));

            if (!dataLine) continue;

            let jsonStr = dataLine.replace(/^data:\s*/, "");
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const evt = JSON.parse(jsonStr);

              // LOG eventlar
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

              // Natija bo'lishi mumkin bo'lgan variantlar:
              let candidate = null;

              if (evt.type === "result" && evt.payload) {
                candidate = evt.payload;
              } else if (
                evt.type === "batch_completed" &&
                evt.results &&
                Array.isArray(evt.results.cards) &&
                evt.results.cards.length > 0
              ) {
                // Agar batch bo'lsa – birinchi kartani olamiz
                candidate = evt.results.cards[0];
              } else if (!evt.type) {
                // type yo'q, lekin bu asl natija bo'lishi mumkin
                candidate = evt;
              }

              if (
                candidate &&
                (candidate.new_title ||
                  candidate.new_description ||
                  candidate.new_characteristics ||
                  typeof candidate.validation_score !== "undefined")
              ) {
                // 🔥 Har bir kelgan natijani darhol UI ga qo'yamiz
                lastCandidate = candidate;
                setResult(candidate);
                initFinalFromResult(card, candidate);
              }
            } catch (err) {
              console.error("Failed to parse SSE data chunk:", err, jsonStr);
              // SSE bo'lak buzilsa log qilamiz, lekin butun jarayonni to'xtatmaymiz
              pushLog(`⚠️ Ошибка парсинга SSE: ${String(err)}`);
            }
          }
        }

        // Stream tugagach, umuman natija bo'lmasa – haqiqiy xato
        if (!lastCandidate) {
          throw new Error("Пустой ответ от сервера (нет финального результата)");
        }

        pushLog("AI обработка завершена (SSE)");

        const sessionId = Date.now().toString();
        const session = {
          id: sessionId,
          article: article.trim(),
          status: "done",
          time: new Date().toLocaleString("ru-RU"),
          validation_score: lastCandidate.validation_score,
        };
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(sessionId);
      } else {
        // 2) Oddiy JSON javob
        const parsed = await res.json();
        setResult(parsed);
        pushLog("AI обработка завершена");

        initFinalFromResult(card, parsed);

        const sessionId = Date.now().toString();
        const session = {
          id: sessionId,
          article: article.trim(),
          status: "done",
          time: new Date().toLocaleString("ru-RU"),
          validation_score: parsed.validation_score,
        };
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(sessionId);
      }
    } catch (e) {
      setError(e.message);
      pushLog(`❌ Ошибка AI: ${e.message}`);

      const sessionId = Date.now().toString();
      const session = {
        id: sessionId,
        article: article.trim(),
        status: "error",
        time: new Date().toLocaleString("ru-RU"),
        validation_score: null,
      };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(sessionId);
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
    // shu yerda backend’ga POST qilasan, masalan:
    // api.submitToWB(token, finalData)
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

  /** History */
  const handleHistorySelect = (id) => {
    setActiveSessionId(id);
    // agar keyinchalik session’larni saqlab qayta yuklashni xohlasang,
    // shu yerga load logikasini qo‘shasan
  };

  const handleHistoryClear = () => {
    setSessions([]);
    setActiveSessionId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <HeaderBar
        username={username}
        onLogout={onLogout}
        onOpenPrompts={() => {}}
      />

      <main className="max-w-[1800px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1.7fr,0.8fr] gap-6">
        <div className="space-y-6">
          {/* Article kiritish + current card */}
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

          {/* WB current card */}
          <CurrentCardPanel
            card={card}
            validation={
              result
                ? { messages: result.validation_issues || [] } // AI characteristics validator
                : currentValidation // 🔥 validation_card natijalari (get_current_card dan)
            }
            editableTitle={card?.title || ""}
            onChangeTitle={() => {}}
            editableDescription={card?.description || ""}
            onChangeDescription={() => {}}
            onGenerate={processing ? handleCancelGenerate : handleGenerate}
            processingGenerate={processing}
          />

          {/* AI natija + compare bloklar */}
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

        {/* Right – History */}
        <HistorySidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={handleHistorySelect}
          onClear={handleHistoryClear}
        />
      </main>
    </div>
  );
}
