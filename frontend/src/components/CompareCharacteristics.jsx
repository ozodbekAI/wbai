import { Check } from "lucide-react";

export default function CompareCharacteristics({
  newChars = [],
  oldChars = [],
  selectedMap,
  onSelectChar,
}) {
  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
        <h3 className="font-bold text-white text-lg">Характеристики — выберите для каждой</h3>
      </div>

      <div className="p-6 space-y-4">
        {newChars.map((newChar, idx) => {
          const oldChar = oldChars.find((c) => c.name === newChar.name);
          const sel = selectedMap[newChar.name] || "new";

          const renderVal = (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

          return (
            <div key={idx} className="border-2 border-gray-200 rounded-xl p-4">
              <div className="font-bold text-purple-900 mb-3">{newChar.name}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {oldChar ? (
                  <button
                    onClick={() => onSelectChar(newChar.name, "old")}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      sel === "old" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-700">Оригинал</span>
                      {sel === "old" && <Check className="w-5 h-5 text-blue-600" />}
                    </div>
                    <p className="text-gray-800">{renderVal(oldChar.value)}</p>
                  </button>
                ) : (
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                    <span className="text-sm text-gray-500">Нет в оригинале</span>
                  </div>
                )}

                <button
                  onClick={() => onSelectChar(newChar.name, "new")}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    sel === "new" ? "border-green-500 bg-green-50 shadow-md" : "border-gray-300 hover:border-green-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-700">AI Генерация</span>
                    {sel === "new" && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                  <p className="text-gray-800">{renderVal(newChar.value)}</p>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
