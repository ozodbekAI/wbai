import { useCallback, useRef, useState } from "react";
import { api } from "../api/client";

export function useSSEProcess(token) {
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const reset = useCallback(() => {
    setLogs([]);
    setResult(null);
    setError(null);
  }, []);

  const start = useCallback(
    async (article) => {
      if (!article?.trim()) {
        setError("Введите nmID или vendorCode");
        return null;
      }

      reset();
      setProcessing(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await api.process({ article: article.trim() }, token);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let finalPayload = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.trim());

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            if (data.type === "log") {
              setLogs((p) => [...p, { time: new Date().toLocaleTimeString(), msg: data.message }]);
            }
            if (data.type === "result") {
              finalPayload = data.data;
              setResult(data.data);
            }
            if (data.type === "error") {
              setError(data.message);
            }
          }
        }

        return finalPayload;
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
        return null;
      } finally {
        setProcessing(false);
        abortRef.current = null;
      }
    },
    [token, reset]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProcessing(false);
  }, []);

  return { processing, logs, result, error, start, cancel, reset, setResult };
}
