// src/components/PromptsPanel.jsx

import React, { useEffect, useState } from "react";
import PhotoTemplatesAdmin from "./PhotoTemplatesAdmin";
import { X, FileText, Plus, Save, Eye, Loader2, Trash2 } from "lucide-react";
import { api } from "../api/client";

export default function PromptsPanel({ open, onClose, token }) {
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [typesMeta, setTypesMeta] = useState([]);
  const [activeTab, setActiveTab] = useState("wb"); // "wb" | "photo"

  const [selectedType, setSelectedType] = useState("");
  const [form, setForm] = useState({
    prompt_type: "",
    system_prompt: "",
    strict_rules: "",
    examples: "",
    change_reason: "",
  });

  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!token) return;

    const load = async () => {
      setLoading(true);
      try {
        const [list, types] = await Promise.all([
          api.prompts.list(token),
          api.prompts.types(token),
        ]);
        setPrompts(list || []);
        setTypesMeta(types?.types || []);
      } catch (err) {
        console.error("Failed to load prompts", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, token]);

  const handleSelectPrompt = async (promptType) => {
    if (!token) return;
    setSelectedType(promptType);
    setPreview(null);

    try {
      const p = await api.prompts.get(token, promptType);
      setForm({
        prompt_type: p.prompt_type,
        system_prompt: p.system_prompt || "",
        strict_rules: p.strict_rules || "",
        examples: p.examples || "",
        change_reason: "",
      });
    } catch (err) {
      console.error("Failed to load prompt", err);
    }
  };

  const handleNewPrompt = () => {
    setSelectedType("");
    setPreview(null);
    setForm({
      prompt_type: "",
      system_prompt: "",
      strict_rules: "",
      examples: "",
      change_reason: "",
    });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.prompt_type.trim()) {
      alert("Укажите prompt_type");
      return;
    }

    setSaving(true);
    try {
      if (selectedType) {
        // UPDATE
        const payload = {
          system_prompt: form.system_prompt,
          // Muhim: bo'sh bo'lsa ham string sifatida yuboramiz
          strict_rules: form.strict_rules,
          examples: form.examples,
          change_reason: form.change_reason || null,
        };
        const updated = await api.prompts.update(token, selectedType, payload);
        setPrompts((prev) =>
          prev.map((p) =>
            p.prompt_type === updated.prompt_type ? updated : p
          )
        );
      } else {
        // CREATE
        const payload = {
          prompt_type: form.prompt_type,
          system_prompt: form.system_prompt,
          strict_rules: form.strict_rules || null,
          examples: form.examples || null,
        };
        const created = await api.prompts.create(token, payload);
        setPrompts((prev) => [...prev, created]);
        setSelectedType(created.prompt_type);
      }
      alert("Промпт сохранён");
      setForm((prev) => ({ ...prev, change_reason: "" }));
    } catch (err) {
      console.error("Failed to save prompt", err);
      alert(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!token || !selectedType) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await api.prompts.preview(token, selectedType);
      setPreview(data);
    } catch (err) {
      console.error("Failed to preview prompt", err);
      alert(err.message || "Ошибка предпросмотра");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!token || !selectedType) return;

    const current = prompts.find((p) => p.prompt_type === selectedType);
    if (!current) return;

    try {
      if (current.is_active !== false) {
        // hozir aktiv -> deaktiv
        if (!window.confirm("Деактивировать этот промпт?")) return;
        await api.prompts.deactivate(token, selectedType);
        setPrompts((prev) =>
          prev.map((p) =>
            p.prompt_type === selectedType ? { ...p, is_active: false } : p
          )
        );
        alert("Промпт деактивирован");
      } else {
        // hozir off -> ON
        const activated = await api.prompts.activate(token, selectedType);
        setPrompts((prev) =>
          prev.map((p) =>
            p.prompt_type === selectedType ? activated : p
          )
        );
        alert("Промпт активирован");
      }
    } catch (err) {
      console.error("Failed to toggle active state", err);
      alert(err.message || "Ошибка изменения статуса");
    }
  };

  const usedTypes = new Set(prompts.map((p) => p.prompt_type));
  const allTypes = typesMeta || [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* panel */}
      <aside className="w-full max-w-5xl h-full bg-white shadow-2xl border-l border-gray-100 flex flex-col">
        {/* header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-gray-900">
                Настройки AI
              </h2>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("wb")}
                className={[
                  "px-3 py-1 rounded-full border text-[11px]",
                  activeTab === "wb"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                WB генератор (текст)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("photo")}
                className={[
                  "px-3 py-1 rounded-full border text-[11px]",
                  activeTab === "photo"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                Фото: сцены / позы
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {activeTab === "wb" ? (
            <>
              {/* LEFT LIST */}
              <div className="w-64 border-r border-gray-100 flex flex-col">
                <div className="px-3 py-2 flex items-center justify-between border-b">
                  <span className="text-xs font-medium text-gray-600">
                    Список промптов
                  </span>
                  <button
                    type="button"
                    onClick={handleNewPrompt}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
                    title="Новый промпт"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-xs">
                  {loading ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                    </div>
                  ) : !prompts.length ? (
                    <div className="text-[11px] text-gray-400 px-1">
                      Пока нет сохранённых промптов.
                    </div>
                  ) : (
                    prompts.map((p) => {
                      const meta = allTypes.find(
                        (t) => t.type === p.prompt_type
                      );
                      const isActive = p.is_active !== false;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPrompt(p.prompt_type)}
                          className={`w-full text-left px-2 py-1.5 rounded-md border text-[11px] ${
                            selectedType === p.prompt_type
                              ? "bg-violet-50 border-violet-300 text-violet-900"
                              : "bg-white border-gray-100 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold truncate">
                              {p.prompt_type}
                            </span>
                            {!isActive && (
                              <span className="text-[9px] px-1 rounded bg-red-50 text-red-500">
                                off
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {meta?.description || ""}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: form + preview */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.8fr,1.2fr] gap-0 overflow-hidden">
                  {/* FORM */}
                  <div className="border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col">
                    <div className="px-4 py-2 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Редактор промпта
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedType && (
                          <button
                            type="button"
                            onClick={handleToggleActive}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            {(() => {
                              const current = prompts.find(
                                (p) => p.prompt_type === selectedType
                              );
                              const isActive = current?.is_active !== false;
                              return isActive ? "Off" : "On";
                            })()}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Сохранить
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs">
                      {/* PROMPT TYPE */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-600">
                          prompt_type
                        </label>
                        <input
                          type="text"
                          className="w-full text-xs border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          value={form.prompt_type}
                          onChange={(e) =>
                            handleChange("prompt_type", e.target.value)
                          }
                          disabled={!!selectedType}
                          placeholder="например: description_generator"
                        />

                        {/* available types chips */}
                        {allTypes.length > 0 && !selectedType && (
                          <div className="mt-2 space-y-1">
                            <div className="text-[10px] text-gray-500">
                              Доступные типы:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {allTypes.map((t) => {
                                const isUsed = usedTypes.has(t.type);
                                const isSelected =
                                  form.prompt_type === t.type;
                                return (
                                  <button
                                    key={t.type}
                                    type="button"
                                    disabled={isUsed}
                                    onClick={() =>
                                      handleChange("prompt_type", t.type)
                                    }
                                    className={[
                                      "text-[10px] px-2 py-0.5 rounded-full border",
                                      "transition-colors",
                                      isUsed
                                        ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                                        : isSelected
                                        ? "border-violet-400 bg-violet-50 text-violet-900"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-50",
                                    ].join(" ")}
                                    title={
                                      t.description
                                        ? `${t.description} (${t.category})`
                                        : t.category || ""
                                    }
                                  >
                                    {t.type}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SYSTEM PROMPT */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-600">
                          System prompt
                        </label>
                        <textarea
                          className="w-full h-32 text-xs border rounded-md px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-violet-500"
                          value={form.system_prompt}
                          onChange={(e) =>
                            handleChange("system_prompt", e.target.value)
                          }
                          placeholder="Основной системный промпт..."
                        />
                      </div>

                      {/* STRICT RULES */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-600">
                          Strict rules (опционально)
                        </label>
                        <textarea
                          className="w-full h-24 text-xs border rounded-md px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-violet-500"
                          value={form.strict_rules}
                          onChange={(e) =>
                            handleChange("strict_rules", e.target.value)
                          }
                          placeholder="СТРОГИЕ ЗАПРЕТЫ..."
                        />
                      </div>

                      {/* EXAMPLES */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-600">
                          Examples (опционально)
                        </label>
                        <textarea
                          className="w-full h-24 text-xs border rounded-md px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-violet-500"
                          value={form.examples}
                          onChange={(e) =>
                            handleChange("examples", e.target.value)
                          }
                          placeholder="Примеры запрос/ответ..."
                        />
                      </div>

                      {selectedType && (
                        <div className="space-y-1">
                          <label className="block text-[11px] text-gray-600">
                            Причина изменения (change_reason)
                          </label>
                          <textarea
                            className="w-full h-16 text-xs border rounded-md px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-violet-500"
                            value={form.change_reason}
                            onChange={(e) =>
                              handleChange("change_reason", e.target.value)
                            }
                            placeholder='Например: "Уточнили требования к title"...'
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW */}
                  <div className="flex flex-col">
                    <div className="px-4 py-2 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Полный промпт (preview)
                      </span>
                      <button
                        type="button"
                        onClick={handlePreview}
                        disabled={!selectedType || previewLoading}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {previewLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        Обновить
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                      {!selectedType ? (
                        <div className="text-[11px] text-gray-400">
                          Выберите промпт слева, чтобы увидеть полный текст.
                        </div>
                      ) : previewLoading ? (
                        <div className="flex items-center justify-center h-20">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                        </div>
                      ) : !preview ? (
                        <div className="text-[11px] text-gray-400">
                          Нажмите &quot;Обновить&quot;, чтобы загрузить
                          preview.
                        </div>
                      ) : (
                        <div className="text-[11px] whitespace-pre-wrap font-mono bg-gray-50 border border-gray-100 rounded-md px-2 py-2">
                          {preview.full_prompt || ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Tab "Фото": alohida admin panel
            <PhotoTemplatesAdmin token={token} />
          )}
        </div>
      </aside>
    </div>
  );
}
