// src/components/CompareCharacteristics.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Check,
  Edit3,
  ArrowRightLeft,
  X,
  Loader2,
  Search,
} from "lucide-react";

import { api } from "../api/client";

export default function CompareCharacteristics({
  newChars = [],
  oldChars = [],
  finalValues = {},
  onChangeFinalValue,
  token,
}) {
  const renderVal = (v) =>
    Array.isArray(v) ? v.join(", ") : String(v ?? "");

  const allNames = useMemo(() => {
    const names = new Set();
    newChars.forEach((c) => c?.name && names.add(c.name));
    oldChars.forEach((c) => c?.name && names.add(c.name));
    return Array.from(names);
  }, [newChars, oldChars]);

  const byName = (list) =>
    list.reduce((acc, c) => {
      if (c?.name) acc[c.name] = c;
      return acc;
    }, {});

  const newByName = useMemo(() => byName(newChars), [newChars]);
  const oldByName = useMemo(() => byName(oldChars), [oldChars]);

  const [dictCache, setDictCache] = useState({});
  const [openField, setOpenField] = useState(null); // qaysi field ochiq
  const [loadingField, setLoadingField] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // umumiy search
  const [drafts, setDrafts] = useState({}); // har field uchun draft

  const dropdownRefs = useRef({}); // har field uchun alohida ref

  const getFinalArray = (name) => {
    const v = finalValues?.[name];
    if (Array.isArray(v)) return v;
    if (!v) return [];
    return String(v)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const canAddMore = (name) => {
    const entry = dictCache[name];
    const max = entry?.max;
    if (typeof max !== "number" || max <= 0) return true;
    return getFinalArray(name).length < max;
  };

  const handleAddManual = (name) => {
    const raw = (drafts[name] || "").trim();
    if (!raw || !canAddMore(name)) return;

    const current = getFinalArray(name);
    if (!current.includes(raw)) {
      onChangeFinalValue(name, [...current, raw]);
    }
    setDrafts((prev) => ({ ...prev, [name]: "" }));
    setSearchTerm("");
  };

  const handleRemoveValue = (name, value) => {
    const current = getFinalArray(name);
    onChangeFinalValue(name, current.filter((v) => v !== value));
  };

  const handleSelectKeyword = (name, value) => {
    if (!canAddMore(name)) return;
    const current = getFinalArray(name);
    if (!current.includes(value)) {
      onChangeFinalValue(name, [...current, value]);
    }
    setDrafts((prev) => ({ ...prev, [name]: "" }));
    setSearchTerm("");
  };

  // Slovarni yuklash (faqat kerak bo‘lganda)
  const loadDictionary = async (name) => {
    if (!token || dictCache[name]) return;

    try {
      setLoadingField(name);
      const data = await api.keywords.byName(token, name);
      setDictCache((prev) => ({
        ...prev,
        [name]: {
          values: Array.isArray(data?.values) ? data.values : [],
          min: typeof data?.min === "number" ? data.min : null,
          max: typeof data?.max === "number" ? data.max : null,
        },
      }));
    } catch (err) {
      console.error("Failed to load keywords for", name, err);
    } finally {
      setLoadingField(null);
    }
  };

  // Input focus bo‘lganda → slovarni yukla va dropdown och
  const handleFocus = async (name) => {
    setOpenField(name);
    if (!dictCache[name]) {
      await loadDictionary(name);
    }
  };

  // Input blur bo‘lganda → dropdown yopiladi (lekin ichidagi elementlarga bosilsa yopilmaydi)
  const handleBlur = (e, name) => {
    // Agar bosilgan joy dropdown ichida bo‘lsa — yopilmasin
    if (dropdownRefs.current[name]?.contains(e.relatedTarget)) {
      return;
    }
    setOpenField(null);
    setSearchTerm("");
  };

  // Input o‘zgarganda → search va draft
  const handleInputChange = (name, value) => {
    setDrafts((prev) => ({ ...prev, [name]: value }));
    setSearchTerm(value);
  };

  // Filtrlangan keywordlar
  const filteredKeywordsFor = (name) => {
    const entry = dictCache[name];
    const all = entry?.values || [];
    if (!searchTerm.trim()) return all.slice(0, 30);
    const q = searchTerm.toLowerCase();
    return all
      .filter((v) => v.toLowerCase().includes(q))
      .slice(0, 30);
  };

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          Сравнение характеристик
        </h3>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[11px] text-gray-500 bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold w-[22%]">
                  Характеристика
                </th>
                <th className="text-left px-3 py-2 font-semibold w-[22%]">
                  Текущее WB
                </th>
                <th className="text-left px-3 py-2 font-semibold w-[22%]">
                  AI (новое)
                </th>
                <th className="text-left px-3 py-2 font-semibold w-[34%]">
                  Итоговое значение
                </th>
              </tr>
            </thead>
            <tbody>
              {allNames.map((name) => {
                const oldC = oldByName[name];
                const newC = newByName[name];
                const oldVal = oldC?.value;
                const newVal = newC?.value;

                const finalArr = getFinalArray(name);
                const isChanged = renderVal(oldVal) !== renderVal(newVal) && renderVal(newVal) !== "";

                const isDictOpen = openField === name;
                const isLoadingDict = loadingField === name;
                const keywords = filteredKeywordsFor(name);

                const dictEntry = dictCache[name] || {};
                const minLimit = dictEntry.min ?? null;
                const maxLimit = dictEntry.max ?? null;
                const currentCount = finalArr.length;

                return (
                  <tr
                    key={name}
                    className="border-t border-gray-100 align-top hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-[12px] text-gray-900">{name}</div>
                        {isChanged && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full w-fit">
                            <Edit3 className="w-3 h-3" />
                            <span>AI предлагает изменить</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="text-[11px] text-gray-700 whitespace-pre-line">
                        {renderVal(oldVal) || <span className="text-gray-400 italic">— нет данных —</span>}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className={"text-[11px] whitespace-pre-line " + (isChanged ? "text-violet-700" : "text-gray-700")}>
                        {renderVal(newVal) || <span className="text-gray-400 italic">— без изменений —</span>}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2">
                        {/* Tanlangan qiymatlar */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {finalArr.length === 0 && (
                            <span className="text-[11px] text-gray-400 italic">Значение не выбрано</span>
                          )}
                          {finalArr.map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-[11px] text-violet-800 font-medium"
                            >
                              {v}
                              <button
                                type="button"
                                onClick={() => handleRemoveValue(name, v)}
                                className="hover:text-violet-900 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}

                          {(minLimit || maxLimit) && (
                            <span className="ml-auto text-[10px] text-gray-500">
                              {currentCount} / {maxLimit ?? "∞"}
                              {minLimit && currentCount < minLimit && (
                                <span className="text-red-500 ml-1">(мин. {minLimit})</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Input + avto-dropdown */}
                        <div className="relative">
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-300">
                            <Search className="w-4 h-4 text-gray-400 ml-2" />
                            <input
                              className="flex-1 px-2 py-1.5 text-[11px] outline-none bg-transparent"
                              placeholder="Введите значение..."
                              value={drafts[name] || ""}
                              onChange={(e) => handleInputChange(name, e.target.value)}
                              onFocus={() => handleFocus(name)}
                              onBlur={(e) => handleBlur(e, name)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddManual(name);
                                }
                              }}
                            />
                            {isLoadingDict && (
                              <Loader2 className="w-4 h-4 animate-spin text-violet-600 mr-2" />
                            )}
                          </div>

                          {/* Dropdown — faqat focus bo‘lganda */}
                          {isDictOpen && (
                            <div
                              ref={(el) => (dropdownRefs.current[name] = el)}
                              className="absolute top-full left-0 right-0 mt-1 border border-violet-200 bg-white rounded-xl shadow-xl max-h-56 overflow-y-auto z-20"
                            >
                              {keywords.length === 0 ? (
                                <div className="px-4 py-3 text-[11px] text-gray-500">
                                  {searchTerm.trim()
                                    ? "Ничего не найдено"
                                    : "Словарь загружается или пустой"}
                                </div>
                              ) : (
                                keywords.map((val) => {
                                  const isSelected = finalArr.includes(val);
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()} // blur ni oldini olish
                                      onClick={() => handleSelectKeyword(name, val)}
                                      className={`w-full text-left px-4 py-2.5 text-[11px] hover:bg-violet-50 transition-colors flex items-center justify-between ${
                                        isSelected ? "bg-violet-50" : ""
                                      }`}
                                    >
                                      <span>{val}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-600" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}