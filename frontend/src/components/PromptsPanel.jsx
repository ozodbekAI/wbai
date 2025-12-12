// src/components/PromptsPanel.jsx

import React, { useEffect, useState } from "react";
import PhotoTemplatesAdmin from "./PhotoTemplatesAdmin";
import {
  X,
  FileText,
  Image,
  Film,
  Plus,
  Save,
  Eye,
  Loader2,
  Trash2,
  Wand2, // Normalize uchun
} from "lucide-react";
import { api } from "../api/client";

// ==================== VIDEO SCENARIOS TAB ====================
function VideoScenariosTab({ token }) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    id: null,
    name: "",
    prompt: "",
    order_index: 0,
    is_active: true,
  });

  const load = async () => {
    try {
      const data = await api.admin.videoScenarios.list(token, { only_active: false });
      setScenarios(data || []);
      if (data?.length && selectedId === null) {
        const first = data[0];
        setSelectedId(first.id);
        setForm({
          id: first.id,
          name: first.name,
          prompt: first.prompt,
          order_index: first.order_index ?? 0,
          is_active: first.is_active ?? true,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const select = (id) => {
    const s = scenarios.find((x) => x.id === id);
    if (!s) return;
    setSelectedId(id);
    setForm({
      id: s.id,
      name: s.name,
      prompt: s.prompt,
      order_index: s.order_index ?? 0,
      is_active: s.is_active ?? true,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.prompt.trim()) {
      return alert("Название и промпт обязательны!");
    }
    try {
      if (form.id) {
        await api.admin.videoScenarios.update(token, form.id, form);
      } else {
        await api.admin.videoScenarios.create(token, form);
      }
      await load();
    } catch (e) {
      alert("Ошибка при сохранении");
    }
  };

  const del = async () => {
    if (!form.id || !confirm("Удалить сценарий?")) return;
    try {
      await api.admin.videoScenarios.delete(token, form.id);
      setForm({ id: null, name: "", prompt: "", order_index: 0, is_active: true });
      setSelectedId(null);
      await load();
    } catch (e) {
      alert("Ошибка при удалении");
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <div className="h-full flex bg-gray-50">
      {/* List */}
      <div className="w-72 border-r bg-white">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-medium text-sm">Видео-сценарии</span>
          <button
            onClick={() => setForm({ id: null, name: "", prompt: "", order_index: 0, is_active: true })}
            className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2 space-y-2 overflow-y-auto h-[calc(100%-56px)]">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => select(s.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                selectedId === s.id ? "bg-purple-600 text-white" : "hover:bg-gray-100"
              }`}
            >
              <div className="font-medium truncate">{s.name}</div>
              {!s.is_active && <div className="text-xs opacity-75">неактивен</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow border p-6 space-y-5">
          <input
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Название"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <textarea
            rows={14}
            className="w-full px-4 py-3 border rounded-lg font-mono text-sm resize-none"
            placeholder="Prompt..."
            value={form.prompt}
            onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
          />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm">Порядок:</span>
              <input
                type="number"
                className="w-20 px-3 py-1.5 border rounded"
                value={form.order_index}
                onChange={(e) => setForm((p) => ({ ...p, order_index: Number(e.target.value) || 0 }))}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <span>Активен</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={save}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Сохранить
            </button>
            {form.id && (
              <button
                onClick={del}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Удалить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== НОРМАЛИЗАЦИЯ — FINAL VERSIYA (SUPER QULAY) ====================
function NormalizeAdminTab({ token }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [items, setItems] = useState([]);

  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);

  // Joriy tahrirlanayotgan element
  const [editingType, setEditingType] = useState(null); // 'cat' | 'sub' | 'item' | null
  const [form, setForm] = useState({ name: "", prompt: "", order_index: 0 });

  // === ZAGRUZKA ===
  const loadCategories = async () => {
    try {
      const data = await api.photo.models.listCategories(token);
      setCategories(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubcategories = async (catId) => {
    if (!catId) return setSubcategories([]);
    try      { const data = await api.photo.models.listSubcategories(token, catId); setSubcategories(data || []); }
    catch (e) { console.error(e); }
  };

  const loadItems = async (subId) => {
    if (!subId) return setItems([]);
    try      { const data = await api.photo.models.listItems(token, subId); setItems(data || []); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { if (token) loadCategories(); }, [token]);

  // === YANGI QO‘ShISH ===
  const startNewCategory = () => {
    setEditingType("cat");
    setSelectedCatId(null);
    setSelectedSubId(null);
    setSubcategories([]);
    setItems([]);
    setForm({ name: "", prompt: "", order_index: categories.length + 1 });
  };

  const startNewSubcategory = () => {
    if (!selectedCatId) return alert("Сначала выберите категорию!");
    setEditingType("sub");
    setSelectedSubId(null);
    setItems([]);
    setForm({ name: "", prompt: "", order_index: subcategories.length + 1 });
  };

  const startNewItem = () => {
    if (!selectedSubId) return alert("Сначала выберите подкатегорию!");
    setEditingType("item");
    setForm({ name: "", prompt: "", order_index: items.length + 1 });
  };

  // === TANLASH ===
  const selectCategory = (cat) => {
    setSelectedCatId(cat.id);
    setSelectedSubId(null);
    setItems([]);
    loadSubcategories(cat.id);
    setEditingType("cat");
    setForm({ name: cat.name, prompt: "", order_index: cat.order_index || 0 });
  };

  const selectSubcategory = (sub) => {
    setSelectedSubId(sub.id);
    loadItems(sub.id);
    setEditingType("sub");
    setForm({ name: sub.name, prompt: "", order_index: sub.order_index || 0 });
  };

  const selectItem = (item) => {
    setEditingType("item");
    setForm({ name: item.name, prompt: item.prompt || "", order_index: item.order_index || 0 });
  };

  // === SAQLASH ===
  const save = async () => {
    if (!form.name.trim()) return alert("Название обязательно!");

    try {
      if (editingType === "cat") {
        if (selectedCatId) {
          await api.photo.models.updateCategory(token, selectedCatId, form);
        } else {
          await api.photo.models.createCategory(token, form);
        }
        loadCategories();
      }

      if (editingType === "sub") {
        if (selectedSubId) {
          await api.photo.models.updateSubcategory(token, selectedSubId, form);
        } else {
          await api.photo.models.createSubcategory(token, selectedCatId, form);
        }
        loadSubcategories(selectedCatId);
      }

      if (editingType === "item") {
        if (form.id) {
          await api.photo.models.updateItem(token, form.id, form);
        } else {
          await api.photo.models.createItem(token, selectedSubId, form);
        }
        loadItems(selectedSubId);
      }

      alert("Сохранено!");
      setForm((p) => ({ ...p, name: "", prompt: "" })); // yangi uchun tozalash
    } catch (e) {
      alert("Ошибка при сохранении");
    }
  };

  // === O‘CHIRISH ===
  const remove = async () => {
    if (!confirm("Удалить?")) return;

    try {
      if (editingType === "cat" && selectedCatId) await api.photo.models.deleteCategory(token, selectedCatId);
      if (editingType === "sub" && selectedSubId) await api.photo.models.deleteSubcategory(token, selectedSubId);
      if (editingType === "item" && form.id) await api.photo.models.deleteItem(token, form.id);

      setForm({ name: "", prompt: "", order_index: 0 });
      setEditingType(null);
      setSelectedSubId(null);
      loadCategories();
    } catch (e) {
      alert("Ошибка удаления");
    }
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* === CHAP TARAF — IYERARXIYA === */}
      <div className="w-96 border-r bg-white flex flex-col">
        <div className="p-5 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Нормализация промптов</h3>
            <button
              onClick={startNewCategory}
              className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* KATEGORIYALAR */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Категории</h4>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    selectedCatId === cat.id
                      ? "bg-purple-600 text-white shadow-lg"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* PODKATEGORIYALAR */}
          {selectedCatId && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Подкатегории</h4>
                <button
                  onClick={startNewSubcategory}
                  className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => selectSubcategory(sub)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                      selectedSubId === sub.id
                        ? "bg-purple-600 text-white shadow-lg"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PROMPTLAR */}
          {selectedSubId && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Промпты</h4>
                <button
                  onClick={startNewItem}
                  className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${
                      form.id === item.id
                        ? "bg-purple-600 text-white shadow-md"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="truncate font-medium">{item.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === O‘NG TARAF — BITTA UNIVERSAL FORMA === */}
      <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-2xl mx-auto">
          {editingType ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 p-8">
              <h2 className="text-2xl font-bold text-purple-700 mb-8 flex items-center gap-3">
                <Wand2 className="w-8 h-8" />
                {editingType === "cat" && (selectedCatId ? "Редактирование категории" : "Новая категория")}
                {editingType === "sub" && (selectedSubId ? "Редактирование подкатегории" : "Новая подкатегория")}
                {editingType === "item" && (form.id ? "Редактирование промпта" : "Новый промпт")}
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-5 py-3.5 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition text-lg"
                    placeholder="Введите название..."
                  />
                </div>

                {editingType === "item" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Промпт</label>
                    <textarea
                      rows={10}
                      value={form.prompt || ""}
                      onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl font-mono text-sm resize-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                      placeholder="Вставьте текст промпта..."
                    />
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Порядок</label>
                    <input
                      type="number"
                      value={form.order_index}
                      onChange={(e) => setForm({ ...form, order_index: +e.target.value || 0 })}
                      className="w-32 px-4 py-3 border-2 rounded-xl focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    onClick={save}
                    className="flex-1 py-4 bg-purple-600 text-white text-lg font-bold rounded-xl hover:bg-purple-700 shadow-lg transition flex items-center justify-center gap-3"
                  >
                    <Save className="w-6 h-6" /> Сохранить
                  </button>
                  {(selectedCatId || selectedSubId || form.id) && (
                    <button
                      onClick={remove}
                      className="px-10 py-4 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 shadow-lg transition flex items-center gap-3"
                    >
                      <Trash2 className="w-6 h-6" /> Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32">
              <Wand2 className="w-24 h-24 mx-auto text-purple-200 mb-6" />
              <p className="text-2xl text-gray-500 font-medium">Выберите или создайте элемент</p>
              <p className="text-gray-400 mt-3">Нажмите на плюс в нужном разделе</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== TABS ====================
const TABS = [
  { key: "wb", label: "WB генератор", icon: FileText },
  { key: "photo", label: "Фото шаблоны", icon: Image },
  { key: "video", label: "Видео-сценарии", icon: Film },
  { key: "normalize", label: "Нормализация", icon: Wand2 }, // YANGI TAB
];

// ==================== MAIN COMPONENT ====================
export default function PromptsPanel({ open, onClose, token }) {
  const [activeTab, setActiveTab] = useState("wb");

  // WB tab
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
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
    if (!open || activeTab !== "wb" || !token) return;

    const load = async () => {
      setLoading(true);
      try {
        const [list, types] = await Promise.all([
          api.prompts.list(token),
          api.prompts.types(token),
        ]);
        setPrompts(list || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, activeTab, token]);

  const selectPrompt = async (type) => {
    setSelectedType(type);
    setPreview(null);
    try {
      const p = await api.prompts.get(token, type);
      setForm({
        prompt_type: p.prompt_type,
        system_prompt: p.system_prompt || "",
        strict_rules: p.strict_rules || "",
        examples: p.examples || "",
        change_reason: "",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const newPrompt = () => {
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

  const change = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const save = async () => {
    if (!form.prompt_type.trim()) return alert("Укажите prompt_type");
    setSaving(true);
    try {
      if (selectedType) {
        await api.prompts.update(token, selectedType, {
          ...form,
          change_reason: form.change_reason || null,
        });
      } else {
        await api.prompts.create(token, form);
      }
      alert("Сохранено");
      setForm((p) => ({ ...p, change_reason: "" }));
      const list = await api.prompts.list(token);
      setPrompts(list || []);
    } catch (e) {
      alert(e.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const previewIt = async () => {
    if (!selectedType) return;
    setPreviewLoading(true);
    try {
      setPreview(await api.prompts.preview(token, selectedType));
    } catch (e) {
      alert("Ошибка превью");
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleActive = async () => {
    if (!selectedType) return;
    try {
      const cur = prompts.find((p) => p.prompt_type === selectedType);
      if (cur?.is_active !== false) {
        await api.prompts.deactivate(token, selectedType);
      } else {
        await api.prompts.activate(token, selectedType);
      }
      const list = await api.prompts.list(token);
      setPrompts(list || []);
    } catch (e) {
      alert("Ошибка");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="w-full max-w-5xl h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-3">
            <FileText className="w-5 h-5" /> AI Настройки
          </h2>
          <div className="flex gap-2 text-sm">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-1.5 rounded flex items-center gap-2 ${
                    activeTab === t.key ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "wb" && (
            <div className="h-full flex">
              {/* List */}
              <div className="w-64 border-r bg-gray-50">
                <div className="p-3 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">Промпты</span>
                  <button onClick={newPrompt} className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 space-y-1 overflow-y-auto h-[calc(100%-56px)]">
                  {loading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                    </div>
                  ) : (
                    prompts.map((p) => (
                      <button
                        key={p.prompt_type}
                        onClick={() => selectPrompt(p.prompt_type)}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          selectedType === p.prompt_type
                            ? "bg-purple-600 text-white"
                            : "hover:bg-gray-200"
                        }`}
                      >
                        <div className="font-medium truncate">{p.prompt_type}</div>
                        {p.is_active === false && <div className="text-xs opacity-75">неактивен</div>}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Form + Preview */}
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow border p-6 space-y-5">
                    <input
                      className="w-full px-4 py-2 border rounded-lg"
                      value={form.prompt_type}
                      onChange={(e) => change("prompt_type", e.target.value)}
                      disabled={!!selectedType}
                      placeholder="prompt_type"
                    />
                    <textarea
                      rows={8}
                      className="w-full px-4 py-3 border rounded-lg font-mono text-sm resize-none"
                      value={form.system_prompt}
                      onChange={(e) => change("system_prompt", e.target.value)}
                      placeholder="System prompt..."
                    />
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 border rounded-lg text-sm"
                      value={form.strict_rules}
                      onChange={(e) => change("strict_rules", e.target.value)}
                      placeholder="Strict rules..."
                    />
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 border rounded-lg text-sm"
                      value={form.examples}
                      onChange={(e) => change("examples", e.target.value)}
                      placeholder="Examples..."
                    />
                    {selectedType && (
                      <textarea
                        rows={3}
                        className="w-full px-4 py-3 border rounded-lg text-sm"
                        value={form.change_reason}
                        onChange={(e) => change("change_reason", e.target.value)}
                        placeholder="Причина изменения..."
                      />
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={save}
                        disabled={saving}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> {saving ? "..." : "Сохранить"}
                      </button>
                      {selectedType && (
                        <button
                          onClick={toggleActive}
                          className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                          Активность
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-96 border-l bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Превью</span>
                    <button
                      onClick={previewIt}
                      disabled={!selectedType || previewLoading}
                      className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      {previewLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs leading-tight overflow-auto h-[calc(100%-48px)]">
                    {preview ? preview.full_prompt || "Пусто" : "Выберите промпт"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "photo" && <PhotoTemplatesAdmin token={token} />}
          {activeTab === "video" && <VideoScenariosTab token={token} />}
          {activeTab === "normalize" && <NormalizeAdminTab token={token} />}
        </div>
      </aside>
    </div>
  );
}