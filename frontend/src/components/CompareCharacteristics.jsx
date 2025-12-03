// src/components/CompareCharacteristics.jsx
import { Check, Edit3, ArrowRightLeft } from "lucide-react";

export default function CompareCharacteristics({
  newChars = [],
  oldChars = [],
  finalValues = {},
  onChangeFinalValue,
}) {
  // value helper
  const renderVal = (v) =>
    Array.isArray(v) ? v.join(", ") : String(v ?? "");

  const allNames = Array.from(
    new Set([
      ...newChars.map((c) => c.name),
      ...oldChars.map((c) => c.name),
    ])
  );

  const byName = (list) =>
    list.reduce((acc, c) => {
      acc[c.name] = c;
      return acc;
    }, {});

  const newByName = byName(newChars);
  const oldByName = byName(oldChars);

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg">
          Характеристики — выберите и отредактируйте итоговые значения
        </h3>
        <span className="text-xs text-violet-100">
          Клик по «Оригинал» или «AI» копирует значение в финальное поле
        </span>
      </div>

      <div className="p-6 space-y-4">
        {allNames.map((name) => {
          const newChar = newByName[name];
          const oldChar = oldByName[name];

          const base =
            name in finalValues
              ? finalValues[name]
              : newChar?.value ?? oldChar?.value ?? [];

          const finalString = Array.isArray(base)
            ? base.join(", ")
            : String(base ?? "");

          const isFromOld =
            finalString &&
            oldChar &&
            finalString === renderVal(oldChar.value);
          const isFromNew =
            finalString &&
            newChar &&
            finalString === renderVal(newChar.value);
          const src =
            isFromOld ? "old" : isFromNew ? "new" : "custom";

          const handleCopyFrom = (source) => {
            const from =
              source === "old"
                ? oldChar
                : newChar;
            if (!from) return;
            const v = from.value;
            onChangeFinalValue(
              name,
              Array.isArray(v)
                ? v
                : [v].filter(Boolean)
            );
          };

          const handleManualChange = (text) => {
            const arr = text
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
            onChangeFinalValue(name, arr);
          };

          return (
            <div
              key={name}
              className="border-2 border-gray-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-purple-900">
                  {name}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                  <span className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                    Источник:{" "}
                    {src === "custom"
                      ? "Ручное"
                      : src === "old"
                      ? "WB"
                      : "AI"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ORIGINAL */}
                <button
                  type="button"
                  onClick={() => handleCopyFrom("old")}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    src === "old"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-300 hover:border-blue-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-700">
                      Оригинал
                    </span>
                    {src === "old" && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  {oldChar ? (
                    <p className="text-gray-800 text-sm">
                      {renderVal(oldChar.value)}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-xs">
                      Нет в оригинале
                    </p>
                  )}
                </button>

                {/* AI */}
                <button
                  type="button"
                  onClick={() => handleCopyFrom("new")}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    src === "new"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-gray-300 hover:border-green-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-green-700">
                      AI Генерация
                    </span>
                    {src === "new" && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  {newChar ? (
                    <p className="text-gray-800 text-sm">
                      {renderVal(newChar.value)}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-xs">
                      Не сгенерировано AI
                    </p>
                  )}
                </button>

                {/* FINAL EDITABLE */}
                <div className="p-3 rounded-lg border-2 border-purple-300 bg-purple-50/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Edit3 className="w-4 h-4 text-purple-700" />
                      <span className="text-xs font-semibold text-purple-900">
                        Итоговое значение
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={finalString}
                    onChange={(e) =>
                      handleManualChange(e.target.value)
                    }
                    className="w-full px-2 py-1 bg-white border border-purple-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y min-h-[60px]"
                    placeholder="Через запятую, если несколько значений..."
                  />
                  <div className="text-[10px] text-gray-500">
                    Значения разделяйте запятыми. При сохранении они
                    будут преобразованы в массив.
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {allNames.length === 0 && (
          <div className="text-sm text-gray-500">
            Нет данных по характеристикам
          </div>
        )}
      </div>
    </section>
  );
}
