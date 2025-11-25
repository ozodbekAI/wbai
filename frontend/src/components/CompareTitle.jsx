import { Check } from "lucide-react";

export default function CompareTitle({ oldTitle, newTitle, selected, onSelect, meta }) {
  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
        <h3 className="font-bold text-white text-lg">Название (Title) — выберите лучший вариант</h3>
      </div>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect("old")}
          className={`text-left p-6 rounded-xl border-3 transition-all ${
            selected === "old" ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-blue-700">Оригинал (WB)</span>
            {selected === "old" && <Check className="w-6 h-6 text-blue-600" />}
          </div>
          <p className="text-gray-800 leading-relaxed">{oldTitle || "Нет данных"}</p>
          <div className="mt-3 text-xs text-gray-500">Длина: {(oldTitle || "").length} символов</div>
        </button>

        <button
          onClick={() => onSelect("new")}
          className={`text-left p-6 rounded-xl border-3 transition-all ${
            selected === "new" ? "border-green-500 bg-green-50 shadow-lg scale-[1.02]" : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-green-700">AI Генерация</span>
            {selected === "new" && <Check className="w-6 h-6 text-green-600" />}
          </div>
          <p className="text-gray-800 leading-relaxed">{newTitle || "Нет данных"}</p>
          <div className="mt-3 text-xs text-gray-500">Длина: {(newTitle || "").length} символов</div>

          {meta?.title_score != null && (
            <div className="mt-2 text-xs text-green-600 font-semibold">
              Score: {meta.title_score}/100 | Попыток: {meta.title_attempts}
            </div>
          )}
        </button>
      </div>
    </section>
  );
}
