// src/components/VideoScenariosPanel.jsx

import { useEffect, useState } from "react";
import { X, Film, Plus, Save, Trash2, Loader2 } from "lucide-react";
import { api } from "../api/client";

export default function VideoScenariosPanel({ open, onClose, token }) {
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    id: null,
    name: "",
    prompt: "",
    order_index: 0,
    is_active: true,
  });

  const loadScenarios = async (keepSelection = false) => {
    if (!token) return;
    setLoading(true);
    try {
      // Assuming api.admin.videoScenarios.list(token) method exists in api/client.js
      // You need to add it similar to other admin APIs
      const scens = await api.admin.videoScenarios.list(token);
      setScenarios(scens || []);

      if (!scens?.length) {
        setSelectedId("");
        setForm({ id: null, name: "", prompt: "", order_index: 0, is_active: true });
        return;
      }

      let scenToSelect = scens[0];
      if (keepSelection) {
        const existing = scens.find((s) => s.id === Number(selectedId));
        if (existing) scenToSelect = existing;
      }

      handleSelect(scenToSelect.id, scens);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id, scensFromState = null) => {
    const scens = scensFromState || scenarios;
    const scen = scens.find((s) => s.id === Number(id));
    if (!scen) return;

    setSelectedId(scen.id);
    setForm({
      id: scen.id,
      name: scen.name || "",
      prompt: scen.prompt || "",
      order_index: scen.order_index ?? 0,
      is_active: scen.is_active ?? true,
    });
  };

  useEffect(() => {
    if (!open || !token) return;
    loadScenarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  // CRUD HANDLERS

  const handleNew = () => {
    setSelectedId("");
    setForm({
      id: null,
      name: "",
      prompt: "",
      order_index: (scenarios.length || 0) + 1,
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Название сценария обязательно");
      return;
    }
    if (!form.prompt.trim()) {
      alert("Prompt для сценария обязателен");
      return;
    }
    try {
      if (form.id) {
        // Update
        await api.admin.videoScenarios.update(token, form.id, {
          name: form.name,
          prompt: form.prompt,
          order_index: Number(form.order_index) || 0,
          is_active: form.is_active,
        });
      } else {
        // Create
        await api.admin.videoScenarios.create(token, {
          name: form.name,
          prompt: form.prompt,
          order_index: Number(form.order_index) || 0,
          is_active: form.is_active,
        });
      }
      await loadScenarios(true);
      alert("Сценарий сохранён");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения сценария");
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!window.confirm("Удалить сценарий?")) return;
    try {
      await api.admin.videoScenarios.delete(token, form.id);
      await loadScenarios(false);
      alert("Сценарий удалён");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления сценария");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* panel */}
      <aside className="w-full max-w-2xl h-full bg-white shadow-2xl border-l border-gray-100 flex flex-col">
        {/* header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-gray-900">Видео-сценарии</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка сценариев...
            </div>
          )}

          {/* SCENARIO LIST & FORM */}
          <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 text-xs">Сценарии</span>
              <button
                type="button"
                onClick={handleNew}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
              >
                <Plus className="w-3 h-3" />
                Новый
              </button>
            </div>
            <select
              className="w-full border rounded-md px-2 py-1 text-xs bg-white"
              value={selectedId || ""}
              onChange={(e) => handleSelect(Number(e.target.value))}
            >
              <option value="">— выберите сценарий —</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? "" : "(неактивен)"}
                </option>
              ))}
            </select>

            <div className="mt-2">
              <label className="block text-[11px] text-gray-500">Название</label>
              <input
                className="w-full border rounded-md px-2 py-1 text-xs"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="mt-2">
              <label className="block text-[11px] text-gray-500">
                Prompt сценария (на русском, подробно)
              </label>
              <textarea
                className="w-full border rounded-md px-2 py-1 text-xs min-h-[120px]"
                value={form.prompt}
                onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[11px] text-gray-500">Порядок (order_index)</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-2 py-1 text-xs"
                  value={form.order_index}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, order_index: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <label className="text-[11px] text-gray-500">Активен</label>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Удалить
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}