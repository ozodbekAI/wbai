import { Check } from "lucide-react";

export default function CompareDescription({
  oldDesc, newDesc, selected, onSelect, meta
}) {
  const warnings = meta?.description_warnings || [];
  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
        <h3 className="font-bold text-white text-lg">Описание — выберите лучший вариант</h3>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect("old")}
          className={`text-left p-6 rounded-xl border-3 transition-all max-h-[400px] overflow-y-auto ${
            selected === "old" ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-inherit pb-2">
            <span className="font-bold text-blue-700">Оригинал (WB)</span>
            {selected === "old" && <Check className="w-6 h-6 text-blue-600" />}
          </div>

          {oldDesc ? (
            <>
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">{oldDesc}</p>
              <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-600">
                Длина: {oldDesc.length} символов
              </div>
            </>
          ) : (
            <p className="text-gray-500 italic">Нет оригинального описания</p>
          )}
        </button>

        <button
          onClick={() => onSelect("new")}
          className={`text-left p-6 rounded-xl border-3 transition-all max-h-[400px] overflow-y-auto ${
            selected === "new" ? "border-green-500 bg-green-50 shadow-lg scale-[1.02]" : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-inherit pb-2">
            <span className="font-bold text-green-700">AI Генерация</span>
            {selected === "new" && <Check className="w-6 h-6 text-green-600" />}
          </div>

          <p className="text-gray-800 leading-relaxed whitespace-pre-line">{newDesc || ""}</p>

          <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
            <div className="text-xs text-gray-600">Длина: {(newDesc || "").length} символов</div>
            {meta?.description_score != null && (
              <div className="text-xs text-green-600 font-semibold">
                Score: {meta.description_score}/100 | Попыток: {meta.description_attempts}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>
      </div>
    </section>
  );
}
