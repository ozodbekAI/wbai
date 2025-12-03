// src/components/CompareDescription.jsx
import { Check, Edit3 } from "lucide-react";

export default function CompareDescription({
  oldDesc,
  newDesc,
  finalDesc,
  onChangeFinalDesc,
  meta,
}) {
  const src =
    (finalDesc || "") === (newDesc || "") ? "new"
      : (finalDesc || "") === (oldDesc || "") ? "old"
      : "custom";

  const warnings = meta?.description_warnings || [];

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
        <h3 className="font-bold text-white text-lg">
          Описание — выберите и отредактируйте итоговый вариант
        </h3>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-[1.2fr,1.2fr,1.1fr] gap-6">
        {/* ORIGINAL */}
        <button
          type="button"
          onClick={() => onChangeFinalDesc(oldDesc || "")}
          className={`text-left p-4 rounded-xl border-2 transition-all max-h-[360px] overflow-y-auto ${
            src === "old"
              ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.01]"
              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-inherit pb-2">
            <span className="font-bold text-blue-700">Оригинал (WB)</span>
            {src === "old" && <Check className="w-5 h-5 text-blue-600" />}
          </div>

          {oldDesc ? (
            <>
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                {oldDesc}
              </p>
              <div className="mt-3 pt-2 border-t border-blue-200 text-xs text-gray-600">
                Длина: {oldDesc.length} символов
              </div>
            </>
          ) : (
            <p className="text-gray-500 italic">Нет оригинального описания</p>
          )}
        </button>

        {/* AI */}
        <button
          type="button"
          onClick={() => onChangeFinalDesc(newDesc || "")}
          className={`text-left p-4 rounded-xl border-2 transition-all max-h-[360px] overflow-y-auto ${
            src === "new"
              ? "border-green-500 bg-green-50 shadow-lg scale-[1.01]"
              : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-inherit pb-2">
            <span className="font-bold text-green-700">AI Генерация</span>
            {src === "new" && <Check className="w-5 h-5 text-green-600" />}
          </div>

          <p className="text-gray-800 leading-relaxed whitespace-pre-line">
            {newDesc || ""}
          </p>

          <div className="mt-3 pt-2 border-t border-green-200 space-y-1">
            <div className="text-xs text-gray-600">
              Длина: {(newDesc || "").length} символов
            </div>
            {meta?.description_score != null && (
              <div className="text-xs text-green-600 font-semibold">
                Score: {meta.description_score}/100 | Попыток:{" "}
                {meta.description_attempts}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="mt-1 space-y-1">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1"
                  >
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* FINAL */}
        <div className="p-4 rounded-xl border-2 border-cyan-300 bg-cyan-50/60 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-700" />
              <span className="font-bold text-cyan-900 text-sm">
                Итоговое описание (для отправки)
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-cyan-700 border border-cyan-200">
              {src === "custom"
                ? "Ручное редактирование"
                : src === "old"
                ? "На основе WB"
                : "На основе AI"}
            </span>
          </div>

          <textarea
            value={finalDesc || ""}
            onChange={(e) => onChangeFinalDesc(e.target.value)}
            className="w-full min-h-[220px] px-3 py-2 bg-white border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm resize-y"
          />
          <div className="text-xs text-gray-600">
            Длина: {(finalDesc || "").length} символов
          </div>
        </div>
      </div>
    </section>
  );
}
