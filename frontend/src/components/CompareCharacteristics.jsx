// src/components/CompareCharacteristics.jsx
import React, { useMemo } from "react";
import {
  Check,
  Edit3,
  ArrowRightLeft,
  Copy,
  Wand2,
} from "lucide-react";

/**
 * props:
 *  - oldChars: [{ name, value }]
 *  - newChars: [{ name, value }]
 *  - finalValues: { [name]: value }
 *  - onChangeFinalValue: (name, valueArrayOrString) => void
 */
export default function CompareCharacteristics({
  newChars = [],
  oldChars = [],
  finalValues = {},
  onChangeFinalValue,
}) {
  const renderVal = (v) => {
    if (Array.isArray(v)) {
      return v.join(", ");
    }
    if (v === null || v === undefined) return "";
    return String(v);
  };

  const normalizeValueArray = (v) => {
    if (Array.isArray(v)) {
      return v.map((x) => String(x).trim()).filter(Boolean);
    }
    if (v === null || v === undefined) return [];
    const s = String(v).trim();
    if (!s) return [];
    // "a, b, c" -> ["a","b","c"]
    if (s.includes(",")) {
      return s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [s];
  };

  // ism bo‘yicha indexlar
  const byName = (list) =>
    list.reduce((acc, c) => {
      if (!c || !c.name) return acc;
      acc[c.name] = c;
      return acc;
    }, {});

  const oldByName = useMemo(() => byName(oldChars), [oldChars]);
  const newByName = useMemo(() => byName(newChars), [newChars]);

  const allNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(oldByName),
          ...Object.keys(newByName),
        ])
      ).sort((a, b) => a.localeCompare(b)),
    [oldByName, newByName]
  );

  const handleTakeOld = (name) => {
    const oldVal = oldByName[name]?.value ?? [];
    const norm = normalizeValueArray(oldVal);
    onChangeFinalValue?.(name, norm);
  };

  const handleTakeNew = (name) => {
    const newVal = newByName[name]?.value ?? [];
    const norm = normalizeValueArray(newVal);
    onChangeFinalValue?.(name, norm);
  };

  const handleManualChange = (name, raw) => {
    const norm = normalizeValueArray(raw);
    onChangeFinalValue?.(name, norm);
  };

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white text-sm">
            Сравнение характеристик
          </h3>
        </div>
        <div className="text-[11px] text-violet-100">
          Слева – текущие, по центру – AI, справа – итоговое значение
        </div>
      </div>

      {/* table header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 text-[11px] font-medium text-gray-500 grid grid-cols-[1.2fr,1fr,1fr,1.1fr] gap-3">
        <div>Характеристика</div>
        <div className="text-center">Текущие</div>
        <div className="text-center">AI</div>
        <div className="text-center">Итог</div>
      </div>

      {/* body */}
      <div className="max-h-[360px] overflow-y-auto">
        {!allNames.length ? (
          <div className="px-4 py-8 text-xs text-gray-400 text-center">
            Характеристики недоступны.
          </div>
        ) : (
          allNames.map((name) => {
            const oldValArr = normalizeValueArray(
              oldByName[name]?.value ?? []
            );
            const newValArr = normalizeValueArray(
              newByName[name]?.value ?? []
            );

            const finalValRaw =
              finalValues?.[name] ??
              newValArr ??
              oldValArr;
            const finalValArr = normalizeValueArray(finalValRaw);

            const oldStr = renderVal(oldValArr);
            const newStr = renderVal(newValArr);
            const finalStr = renderVal(finalValArr);

            const isChanged =
              finalStr !== oldStr && finalStr !== "";

            return (
              <div
                key={name}
                className={`px-4 py-2.5 border-b border-gray-50 text-[11px] grid grid-cols-[1.2fr,1fr,1fr,1.1fr] gap-3 items-start ${
                  isChanged ? "bg-violet-50/40" : "bg-white"
                }`}
              >
                {/* Name */}
                <div className="pr-2">
                  <div className="font-semibold text-gray-900 truncate">
                    {name}
                  </div>
                  {isChanged && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-violet-700 bg-violet-100/80 px-1.5 py-0.5 rounded-full">
                      <Wand2 className="w-3 h-3" />
                      <span>Изменено AI</span>
                    </div>
                  )}
                </div>

                {/* Old */}
                <div className="text-[11px] text-gray-700">
                  {oldStr ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100">
                      {oldStr}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>

                {/* New (AI) */}
                <div className="text-[11px] text-purple-800">
                  {newStr ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100">
                      {newStr}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>

                {/* Final */}
                <div className="flex flex-col gap-1">
                  <input
                    className="w-full text-[11px] border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                    value={finalStr}
                    onChange={(e) =>
                      handleManualChange(name, e.target.value)
                    }
                    placeholder="Итоговое значение..."
                  />

                  <div className="flex flex-wrap gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => handleTakeOld(name)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Текущее</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTakeNew(name)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      <Check className="w-3 h-3" />
                      <span>AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
