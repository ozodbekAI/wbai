// src/components/CompareTitle.jsx
import { Check, Edit3 } from "lucide-react";

export default function CompareTitle({
  oldTitle,
  newTitle,
  finalTitle,
  onChangeFinalTitle,
  meta,
}) {
  const src =
    finalTitle === (newTitle || "") ? "new"
      : finalTitle === (oldTitle || "") ? "old"
      : "custom";

  const lengthOld = (oldTitle || "").length;
  const lengthNew = (newTitle || "").length;
  const lengthFinal = (finalTitle || "").length;

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg">
          Название (Title) — выберите и отредактируйте итоговый вариант
        </h3>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ORIGINAL */}
        <button
          type="button"
          onClick={() => onChangeFinalTitle(oldTitle || "")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            src === "old"
              ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.01]"
              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-blue-700">Оригинал (WB)</span>
            {src === "old" && <Check className="w-5 h-5 text-blue-600" />}
          </div>
          <p className="text-gray-800 leading-relaxed">
            {oldTitle || "Нет данных"}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Длина: {lengthOld} символов
          </div>
        </button>

        {/* AI */}
        <button
          type="button"
          onClick={() => onChangeFinalTitle(newTitle || "")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            src === "new"
              ? "border-green-500 bg-green-50 shadow-lg scale-[1.01]"
              : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-green-700">AI Генерация</span>
            {src === "new" && <Check className="w-5 h-5 text-green-600" />}
          </div>
          <p className="text-gray-800 leading-relaxed">
            {newTitle || "Нет данных"}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Длина: {lengthNew} символов
          </div>

          {meta?.title_score != null && (
            <div className="mt-1 text-xs text-green-600 font-semibold">
              Score: {meta.title_score}/100 | Попыток: {meta.title_attempts}
            </div>
          )}
          {meta?.title_warnings?.length > 0 && (
            <ul className="mt-1 text-[11px] text-amber-700 space-y-0.5">
              {meta.title_warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
        </button>

        {/* FINAL */}
        <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-50/60 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-purple-800 text-sm">
                Итоговый title (для отправки)
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-purple-700 border border-purple-200">
              {src === "custom"
                ? "Ручное редактирование"
                : src === "old"
                ? "На основе WB"
                : "На основе AI"}
            </span>
          </div>

          <input
            type="text"
            value={finalTitle || ""}
            onChange={(e) => onChangeFinalTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />
          <div className="text-xs text-gray-600">
            Длина: {lengthFinal} символов
          </div>
        </div>
      </div>
    </section>
  );
}
