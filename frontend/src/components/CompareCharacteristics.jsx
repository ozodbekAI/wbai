// src/components/CompareCharacteristics.jsx
import { useMemo, useState } from "react";
import {
  Check,
  Edit3,
  ArrowRightLeft,
  X,
  BookOpen,   // BookOpenText o‘rniga
  Loader2,
} from "lucide-react";

import { api } from "../api/client";

export default function CompareCharacteristics({
  newChars = [],
  oldChars = [],
  finalValues = {},
  onChangeFinalValue,
  token,
}) {
  // value helper
  const renderVal = (v) =>
    Array.isArray(v) ? v.join(", ") : String(v ?? "");

  // xavfsiz allNames
  const allNames = useMemo(() => {
    const names = new Set();

    newChars.forEach((c) => {
      if (c && c.name) names.add(c.name);
    });
    oldChars.forEach((c) => {
      if (c && c.name) names.add(c.name);
    });

    return Array.from(names);
  }, [newChars, oldChars]);

  // ism bo‘yicha indexlar – guard bilan
  const byName = (list) =>
    list.reduce((acc, c) => {
      if (!c || !c.name) return acc;
      acc[c.name] = c;
      return acc;
    }, {});

  const newByName = useMemo(() => byName(newChars), [newChars]);
  const oldByName = useMemo(() => byName(oldChars), [oldChars]);

  // Lokal state – dictionary, dropdown va inputlar
  // dictCache: { [name]: { values: string[], min: number|null, max: number|null } }
  const [dictCache, setDictCache] = useState({});
  const [openField, setOpenField] = useState(null); // qaysi field uchun slovar ochilgan
  const [loadingField, setLoadingField] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [drafts, setDrafts] = useState({}); // { [name]: current input text }

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
    const maxLimit = entry?.max;

    if (typeof maxLimit !== "number" || maxLimit <= 0) {
      return true; // limit yo'q
    }

    const current = getFinalArray(name);
    return current.length < maxLimit;
  };

  const handleAddManual = (name) => {
    const raw = (drafts[name] || "").trim();
    if (!raw) return;

    if (!canAddMore(name)) {
      // xohlasang shu yerda toast/log qo'yish mumkin
      console.warn("Max limit reached for", name);
      return;
    }

    const current = getFinalArray(name);
    if (!current.includes(raw)) {
      onChangeFinalValue(name, [...current, raw]);
    }
    setDrafts((prev) => ({ ...prev, [name]: "" }));
  };

  const handleRemoveValue = (name, value) => {
    const current = getFinalArray(name);
    onChangeFinalValue(
      name,
      current.filter((v) => v !== value)
    );
  };

  const handleSelectKeyword = (name, value) => {
    if (!canAddMore(name)) {
      console.warn("Max limit reached for", name);
      return;
    }

    const current = getFinalArray(name);
    if (!current.includes(value)) {
      onChangeFinalValue(name, [...current, value]);
    }
  };

  const handleToggleDict = async (name) => {
    if (!token) return;

    if (openField === name) {
      // yopish
      setOpenField(null);
      setSearchTerm("");
      return;
    }

    setOpenField(name);
    setSearchTerm(drafts[name] || "");

    if (!dictCache[name]) {
      try {
        setLoadingField(name);
        const data = await api.keywords.byName(token, name);
        // data: { values: [], min: int|null, max: int|null }
        setDictCache((prev) => ({
          ...prev,
          [name]: {
            values: Array.isArray(data?.values) ? data.values : [],
            min:
              typeof data?.min === "number" ? data.min : null,
            max:
              typeof data?.max === "number" ? data.max : null,
          },
        }));
      } catch (err) {
        console.error("Failed to load keywords for", name, err);
      } finally {
        setLoadingField(null);
      }
    }
  };

  const filteredKeywordsFor = (name) => {
    const entry = dictCache[name];
    const all = entry?.values || [];
    if (!searchTerm) return all;
    const q = searchTerm.toLowerCase();
    return all.filter((v) => v.toLowerCase().includes(q));
  };

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          Сравнение характеристик
        </h3>
        <p className="text-violet-100 text-xs">
          Старые значения WB, новые AI и финальный выбор
        </p>
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
                const isChanged =
                  renderVal(oldVal) !== renderVal(newVal) &&
                  renderVal(newVal) !== "";

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
                    {/* Name */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-[12px] text-gray-900">
                          {name}
                        </div>
                        {isChanged && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full w-fit">
                            <Edit3 className="w-3 h-3" />
                            <span>AI предлагает изменить</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Old WB */}
                    <td className="px-3 py-3">
                      <div className="text-[11px] text-gray-700 whitespace-pre-line">
                        {renderVal(oldVal) || (
                          <span className="text-gray-400 italic">
                            — нет данных —
                          </span>
                        )}
                      </div>
                    </td>

                    {/* New AI */}
                    <td className="px-3 py-3">
                      <div
                        className={
                          "text-[11px] whitespace-pre-line " +
                          (isChanged
                            ? "text-violet-700"
                            : "text-gray-700")
                        }
                      >
                        {renderVal(newVal) || (
                          <span className="text-gray-400 italic">
                            — без изменений —
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Final + keywords + chips */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        {/* Chips */}
                        <div className="flex flex-wrap gap-1 items-center">
                          {finalArr.length === 0 && (
                            <span className="text-[11px] text-gray-400 italic">
                              Значение не выбрано
                            </span>
                          )}

                          {finalArr.map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-violet-100 bg-violet-50 text-[11px] text-violet-800"
                            >
                              <span>{v}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveValue(name, v)
                                }
                                className="hover:text-violet-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}

                          {(minLimit || maxLimit) && (
                            <span className="ml-auto text-[10px] text-gray-500">
                              Выбрано {currentCount}
                              {typeof maxLimit === "number" &&
                                ` / ${maxLimit}`}
                              {typeof minLimit === "number" &&
                                currentCount < minLimit && (
                                  <span className="text-red-500 ml-1">
                                    (мин. {minLimit})
                                  </span>
                                )}
                            </span>
                          )}
                        </div>

                        {/* Input + slovar button */}
                        <div className="flex items-center gap-1.5">
                          <input
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 bg-white"
                            placeholder="Введите значение или начните печатать для фильтра словаря…"
                            value={drafts[name] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDrafts((prev) => ({
                                ...prev,
                                [name]: val,
                              }));
                              if (openField === name) {
                                setSearchTerm(val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddManual(name);
                              }
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => handleToggleDict(name)}
                            className={
                              "inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] " +
                              (isDictOpen
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700")
                            }
                          >
                            {isLoadingDict ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <BookOpen className="w-3 h-3" />
                            )}
                            <span>словарь</span>
                          </button>
                        </div>

                        {/* Dropdown – keywords list */}
                        {isDictOpen && (
                          <div className="mt-1 border border-violet-100 bg-white rounded-xl shadow-lg max-h-48 overflow-y-auto text-[11px]">
                            {!dictCache[name] ||
                            (dictCache[name] &&
                              (dictCache[name].values || [])
                                .length === 0) ? (
                              <div className="px-3 py-2 text-gray-400">
                                Справочник для этой характеристики
                                пустой или не найден. Можно вводить
                                любое значение вручную.
                              </div>
                            ) : (
                              <>
                                {keywords.length === 0 ? (
                                  <div className="px-3 py-2 text-gray-400">
                                    По вашему фильтру ничего не найдено.
                                  </div>
                                ) : (
                                  keywords.map((val) => {
                                    const isSelected =
                                      finalArr.includes(val);
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() =>
                                          handleSelectKeyword(
                                            name,
                                            val
                                          )
                                        }
                                        className={
                                          "w-full text-left px-3 py-1.5 border-b border-violet-50 last:border-b-0 hover:bg-violet-50 transition-colors flex items-center justify-between " +
                                          (isSelected
                                            ? "bg-violet-50/80"
                                            : "")
                                        }
                                      >
                                        <span>{val}</span>
                                        {isSelected && (
                                          <Check className="w-3 h-3 text-violet-600" />
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </>
                            )}
                          </div>
                        )}
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
