// src/components/PhotoTemplatesAdmin.jsx

import React, { useEffect, useState } from "react";
import { Plus, Save, Trash2, Loader2, Image as ImageIcon } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Oddiy helper
const buildUrl = (path) => `${API_BASE}${path}`;

async function request(path, method = "GET", token, body) {
  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // json bo'lmasligi ham mumkin
  }

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.message ||
      data?.error ||
      res.statusText ||
      "Request failed";
    throw new Error(msg);
  }

  return data;
}

export default function PhotoTemplatesAdmin({ token }) {
  const [activeMode, setActiveMode] = useState("scenes"); // "scenes" | "poses"

  // ===== SCENES =====
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneCategories, setSceneCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [sceneSubcategories, setSceneSubcategories] = useState([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [sceneItems, setSceneItems] = useState([]);

  const [categoryForm, setCategoryForm] = useState({ id: null, name: "" });
  const [subcategoryForm, setSubcategoryForm] = useState({
    id: null,
    name: "",
  });
  const [itemForm, setItemForm] = useState({
    id: null,
    name: "",
    prompt: "",
  });

  // ===== POSES =====
  const [poseLoading, setPoseLoading] = useState(false);
  const [poseGroups, setPoseGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [poseSubgroups, setPoseSubgroups] = useState([]);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(null);
  const [posePrompts, setPosePrompts] = useState([]);

  const [groupForm, setGroupForm] = useState({ id: null, name: "" });
  const [poseSubgroupForm, setPoseSubgroupForm] = useState({
    id: null,
    name: "",
  });
  const [posePromptForm, setPosePromptForm] = useState({
    id: null,
    name: "",
    prompt: "",
  });

  // ===== LOAD SCENES =====
  useEffect(() => {
    if (!token) return;
    if (activeMode !== "scenes") return;

    const loadScenes = async () => {
      setSceneLoading(true);
      try {
        const cats = await request(
          "/api/photo/scenes/categories",
          "GET",
          token
        );
        setSceneCategories(cats || []);
      } catch (err) {
        console.error("Failed to load scene categories", err);
      } finally {
        setSceneLoading(false);
      }
    };

    loadScenes();
  }, [token, activeMode]);

  const handleSelectSceneCategory = async (cat) => {
    setSelectedCategoryId(cat.id);
    setCategoryForm({ id: cat.id, name: cat.name });
    setSceneSubcategories([]);
    setSelectedSubcategoryId(null);
    setSceneItems([]);
    setSubcategoryForm({ id: null, name: "" });
    setItemForm({ id: null, name: "", prompt: "" });

    try {
      const subcats = await request(
        `/api/photo/scenes/${cat.id}/subcategories`,
        "GET",
        token
      );
      setSceneSubcategories(subcats || []);
    } catch (err) {
      console.error("Failed to load subcategories", err);
    }
  };

  const handleSelectSceneSubcategory = async (sub) => {
    setSelectedSubcategoryId(sub.id);
    setSubcategoryForm({ id: sub.id, name: sub.name });
    setSceneItems([]);
    setItemForm({ id: null, name: "", prompt: "" });

    try {
      const items = await request(
        `/api/photo/scenes/subcategories/${sub.id}/items`,
        "GET",
        token
      );
      setSceneItems(items || []);
    } catch (err) {
      console.error("Failed to load items", err);
    }
  };

  const handleSelectSceneItem = (item) => {
    setItemForm({
      id: item.id,
      name: item.name,
      prompt: item.prompt || "",
    });
  };

  // CREATE/UPDATE/DELETE SCENES
  const saveSceneCategory = async () => {
    if (!token) return;
    if (!categoryForm.name.trim()) {
      alert("Введите название категории");
      return;
    }
    try {
      if (categoryForm.id) {
        // update
        const updated = await request(
          `/api/admin/photo/scenes/categories/${categoryForm.id}`,
          "PATCH",
          token,
          { name: categoryForm.name }
        );
        setSceneCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        alert("Категория обновлена");
      } else {
        // create
        const created = await request(
          "/api/admin/photo/scenes/categories",
          "POST",
          token,
          { name: categoryForm.name }
        );
        setSceneCategories((prev) => [...prev, created]);
        setCategoryForm({ id: created.id, name: created.name });
        alert("Категория создана");
      }
    } catch (err) {
      console.error("Failed to save category", err);
      alert(err.message || "Ошибка сохранения категории");
    }
  };

  const deleteSceneCategory = async () => {
    if (!token || !categoryForm.id) return;
    if (!window.confirm("Удалить категорию со всеми данными?")) return;

    try {
      await request(
        `/api/admin/photo/scenes/categories/${categoryForm.id}`,
        "DELETE",
        token
      );
      setSceneCategories((prev) =>
        prev.filter((c) => c.id !== categoryForm.id)
      );
      setCategoryForm({ id: null, name: "" });
      setSelectedCategoryId(null);
      setSceneSubcategories([]);
      setSelectedSubcategoryId(null);
      setSceneItems([]);
      alert("Категория удалена");
    } catch (err) {
      console.error("Failed to delete category", err);
      alert(err.message || "Ошибка удаления категории");
    }
  };

  const saveSceneSubcategory = async () => {
    if (!token) return;
    if (!selectedCategoryId) {
      alert("Сначала выберите категорию");
      return;
    }
    if (!subcategoryForm.name.trim()) {
      alert("Введите название подкатегории");
      return;
    }

    try {
      if (subcategoryForm.id) {
        const updated = await request(
          `/api/admin/photo/scenes/subcategories/${subcategoryForm.id}`,
          "PATCH",
          token,
          { name: subcategoryForm.name }
        );
        setSceneSubcategories((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        alert("Подкатегория обновлена");
      } else {
        const created = await request(
          `/api/admin/photo/scenes/categories/${selectedCategoryId}/subcategories`,
          "POST",
          token,
          { name: subcategoryForm.name }
        );
        setSceneSubcategories((prev) => [...prev, created]);
        setSubcategoryForm({ id: created.id, name: created.name });
        alert("Подкатегория создана");
      }
    } catch (err) {
      console.error("Failed to save subcategory", err);
      alert(err.message || "Ошибка сохранения подкатегории");
    }
  };

  const deleteSceneSubcategory = async () => {
    if (!token || !subcategoryForm.id) return;
    if (!window.confirm("Удалить подкатегорию со всеми сценами?")) return;

    try {
      await request(
        `/api/admin/photo/scenes/subcategories/${subcategoryForm.id}`,
        "DELETE",
        token
      );
      setSceneSubcategories((prev) =>
        prev.filter((s) => s.id !== subcategoryForm.id)
      );
      setSubcategoryForm({ id: null, name: "" });
      setSelectedSubcategoryId(null);
      setSceneItems([]);
      alert("Подкатегория удалена");
    } catch (err) {
      console.error("Failed to delete subcategory", err);
      alert(err.message || "Ошибка удаления подкатегории");
    }
  };

  const saveSceneItem = async () => {
    if (!token) return;
    if (!selectedSubcategoryId) {
      alert("Выберите подкатегорию");
      return;
    }
    if (!itemForm.name.trim()) {
      alert("Введите название сцены");
      return;
    }

    try {
      if (itemForm.id) {
        const updated = await request(
          `/api/admin/photo/scenes/items/${itemForm.id}`,
          "PATCH",
          token,
          {
            name: itemForm.name,
            prompt: itemForm.prompt || "",
          }
        );
        setSceneItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
        alert("Сцена обновлена");
      } else {
        const created = await request(
          `/api/admin/photo/scenes/subcategories/${selectedSubcategoryId}/items`,
          "POST",
          token,
          {
            name: itemForm.name,
            prompt: itemForm.prompt || "",
          }
        );
        setSceneItems((prev) => [...prev, created]);
        setItemForm({
          id: created.id,
          name: created.name,
          prompt: created.prompt || "",
        });
        alert("Сцена создана");
      }
    } catch (err) {
      console.error("Failed to save item", err);
      alert(err.message || "Ошибка сохранения сцены");
    }
  };

  const deleteSceneItem = async () => {
    if (!token || !itemForm.id) return;
    if (!window.confirm("Удалить сцену?")) return;

    try {
      await request(
        `/api/admin/photo/scenes/items/${itemForm.id}`,
        "DELETE",
        token
      );
      setSceneItems((prev) => prev.filter((i) => i.id !== itemForm.id));
      setItemForm({ id: null, name: "", prompt: "" });
      alert("Сцена удалена");
    } catch (err) {
      console.error("Failed to delete item", err);
      alert(err.message || "Ошибка удаления сцены");
    }
  };

  // ===== LOAD POSES =====
  useEffect(() => {
    if (!token) return;
    if (activeMode !== "poses") return;

    const loadPoses = async () => {
      setPoseLoading(true);
      try {
        const groups = await request("/api/photo/poses/groups", "GET", token);
        setPoseGroups(groups || []);
      } catch (err) {
        console.error("Failed to load pose groups", err);
      } finally {
        setPoseLoading(false);
      }
    };

    loadPoses();
  }, [token, activeMode]);

  const handleSelectPoseGroup = async (group) => {
    setSelectedGroupId(group.id);
    setGroupForm({ id: group.id, name: group.name });
    setPoseSubgroups([]);
    setSelectedSubgroupId(null);
    setPosePrompts([]);
    setPoseSubgroupForm({ id: null, name: "" });
    setPosePromptForm({ id: null, name: "", prompt: "" });

    try {
      const subs = await request(
        `/api/photo/poses/groups/${group.id}/subgroups`,
        "GET",
        token
      );
      setPoseSubgroups(subs || []);
    } catch (err) {
      console.error("Failed to load pose subgroups", err);
    }
  };

  const handleSelectPoseSubgroup = async (sub) => {
    setSelectedSubgroupId(sub.id);
    setPoseSubgroupForm({ id: sub.id, name: sub.name });
    setPosePrompts([]);
    setPosePromptForm({ id: null, name: "", prompt: "" });

    try {
      const prompts = await request(
        `/api/photo/poses/subgroups/${sub.id}/prompts`,
        "GET",
        token
      );
      setPosePrompts(prompts || []);
    } catch (err) {
      console.error("Failed to load pose prompts", err);
    }
  };

  const handleSelectPosePrompt = (p) => {
    setPosePromptForm({
      id: p.id,
      name: p.name,
      prompt: p.prompt || "",
    });
  };

  // CREATE/UPDATE/DELETE POSES (admin endpoints — backendda shu URL’larga moslab yozasan)
  const savePoseGroup = async () => {
    if (!token) return;
    if (!groupForm.name.trim()) {
      alert("Введите название группы поз");
      return;
    }
    try {
      if (groupForm.id) {
        const updated = await request(
          `/api/admin/photo/poses/groups/${groupForm.id}`,
          "PATCH",
          token,
          { name: groupForm.name }
        );
        setPoseGroups((prev) =>
          prev.map((g) => (g.id === updated.id ? updated : g))
        );
        alert("Группа поз обновлена");
      } else {
        const created = await request(
          `/api/admin/photo/poses/groups`,
          "POST",
          token,
          { name: groupForm.name }
        );
        setPoseGroups((prev) => [...prev, created]);
        setGroupForm({ id: created.id, name: created.name });
        alert("Группа поз создана");
      }
    } catch (err) {
      console.error("Failed to save pose group", err);
      alert(err.message || "Ошибка сохранения группы поз");
    }
  };

  const deletePoseGroup = async () => {
    if (!token || !groupForm.id) return;
    if (!window.confirm("Удалить группу поз?")) return;

    try {
      await request(
        `/api/admin/photo/poses/groups/${groupForm.id}`,
        "DELETE",
        token
      );
      setPoseGroups((prev) => prev.filter((g) => g.id !== groupForm.id));
      setGroupForm({ id: null, name: "" });
      setSelectedGroupId(null);
      setPoseSubgroups([]);
      setSelectedSubgroupId(null);
      setPosePrompts([]);
      alert("Группа поз удалена");
    } catch (err) {
      console.error("Failed to delete pose group", err);
      alert(err.message || "Ошибка удаления группы поз");
    }
  };

  const savePoseSubgroup = async () => {
    if (!token) return;
    if (!selectedGroupId) {
      alert("Сначала выберите группу поз");
      return;
    }
    if (!poseSubgroupForm.name.trim()) {
      alert("Введите название подгруппы поз");
      return;
    }
    try {
      if (poseSubgroupForm.id) {
        const updated = await request(
          `/api/admin/photo/poses/subgroups/${poseSubgroupForm.id}`,
          "PATCH",
          token,
          { name: poseSubgroupForm.name }
        );
        setPoseSubgroups((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        alert("Подгруппа поз обновлена");
      } else {
        const created = await request(
          `/api/admin/photo/poses/groups/${selectedGroupId}/subgroups`,
          "POST",
          token,
          { name: poseSubgroupForm.name }
        );
        setPoseSubgroups((prev) => [...prev, created]);
        setPoseSubgroupForm({ id: created.id, name: created.name });
        alert("Подгруппа поз создана");
      }
    } catch (err) {
      console.error("Failed to save pose subgroup", err);
      alert(err.message || "Ошибка сохранения подгруппы поз");
    }
  };

  const deletePoseSubgroup = async () => {
    if (!token || !poseSubgroupForm.id) return;
    if (!window.confirm("Удалить подгруппу поз?")) return;

    try {
      await request(
        `/api/admin/photo/poses/subgroups/${poseSubgroupForm.id}`,
        "DELETE",
        token
      );
      setPoseSubgroups((prev) =>
        prev.filter((s) => s.id !== poseSubgroupForm.id)
      );
      setPoseSubgroupForm({ id: null, name: "" });
      setSelectedSubgroupId(null);
      setPosePrompts([]);
      alert("Подгруппа поз удалена");
    } catch (err) {
      console.error("Failed to delete pose subgroup", err);
      alert(err.message || "Ошибка удаления подгруппы поз");
    }
  };

  const savePosePrompt = async () => {
    if (!token) return;
    if (!selectedSubgroupId) {
      alert("Сначала выберите подгруппу поз");
      return;
    }
    if (!posePromptForm.name.trim()) {
      alert("Введите название позы");
      return;
    }

    try {
      if (posePromptForm.id) {
        const updated = await request(
          `/api/admin/photo/poses/prompts/${posePromptForm.id}`,
          "PATCH",
          token,
          {
            name: posePromptForm.name,
            prompt: posePromptForm.prompt || "",
          }
        );
        setPosePrompts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        alert("Поза обновлена");
      } else {
        const created = await request(
          `/api/admin/photo/poses/subgroups/${selectedSubgroupId}/prompts`,
          "POST",
          token,
          {
            name: posePromptForm.name,
            prompt: posePromptForm.prompt || "",
          }
        );
        setPosePrompts((prev) => [...prev, created]);
        setPosePromptForm({
          id: created.id,
          name: created.name,
          prompt: created.prompt || "",
        });
        alert("Поза создана");
      }
    } catch (err) {
      console.error("Failed to save pose prompt", err);
      alert(err.message || "Ошибка сохранения позы");
    }
  };

  const deletePosePrompt = async () => {
    if (!token || !posePromptForm.id) return;
    if (!window.confirm("Удалить позу?")) return;

    try {
      await request(
        `/api/admin/photo/poses/prompts/${posePromptForm.id}`,
        "DELETE",
        token
      );
      setPosePrompts((prev) =>
        prev.filter((p) => p.id !== posePromptForm.id)
      );
      setPosePromptForm({ id: null, name: "", prompt: "" });
      alert("Поза удалена");
    } catch (err) {
      console.error("Failed to delete pose prompt", err);
      alert(err.message || "Ошибка удаления позы");
    }
  };

  // ===== RENDER SCENES UI =====
  const renderScenes = () => (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <ImageIcon className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-gray-800">
            Шаблоны сцен (категория → подкатегория → сцена)
          </span>
        </div>
        {sceneLoading && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Загрузка...
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 border-t border-gray-100">
        {/* Categories */}
        <div className="border-r border-gray-100 flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between border-b">
            <span>Категории сцен</span>
            <button
              type="button"
              onClick={() => {
                setCategoryForm({ id: null, name: "" });
                setSelectedCategoryId(null);
                setSceneSubcategories([]);
                setSelectedSubcategoryId(null);
                setSceneItems([]);
              }}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {sceneCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectSceneCategory(c)}
                className={[
                  "w-full text-left px-3 py-1.5 border-b text-[11px]",
                  selectedCategoryId === c.id
                    ? "bg-violet-50 border-violet-200 text-violet-900"
                    : "bg-white border-gray-100 hover:bg-gray-50",
                ].join(" ")}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[11px]">
            <input
              value={categoryForm.name}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full text-xs border rounded-md px-2 py-1"
              placeholder="Название категории"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={saveSceneCategory}
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {categoryForm.id && (
                <button
                  type="button"
                  onClick={deleteSceneCategory}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subcategories */}
        <div className="border-r border-gray-100 flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between border-b">
            <span>Подкатегории</span>
            <button
              type="button"
              onClick={() => {
                setSubcategoryForm({ id: null, name: "" });
                setSelectedSubcategoryId(null);
                setSceneItems([]);
              }}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {!selectedCategoryId ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                Выберите категорию.
              </div>
            ) : (
              sceneSubcategories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSceneSubcategory(s)}
                  className={[
                    "w-full text-left px-3 py-1.5 border-b text-[11px]",
                    selectedSubcategoryId === s.id
                      ? "bg-violet-50 border-violet-200 text-violet-900"
                      : "bg-white border-gray-100 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {s.name}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[11px]">
            <input
              value={subcategoryForm.name}
              onChange={(e) =>
                setSubcategoryForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="w-full text-xs border rounded-md px-2 py-1"
              placeholder="Название подкатегории"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={saveSceneSubcategory}
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {subcategoryForm.id && (
                <button
                  type="button"
                  onClick={deleteSceneSubcategory}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items (scene items) */}
        <div className="flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between border-b">
            <span>Сцены (item + prompt)</span>
            <button
              type="button"
              onClick={() =>
                setItemForm({ id: null, name: "", prompt: "" })
              }
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {!selectedSubcategoryId ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                Выберите подкатегорию.
              </div>
            ) : !sceneItems.length ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                Пока нет сцен. Добавьте новую.
              </div>
            ) : (
              sceneItems.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => handleSelectSceneItem(i)}
                  className={[
                    "w-full text-left px-3 py-1.5 border-b text-[11px]",
                    itemForm.id === i.id
                      ? "bg-violet-50 border-violet-200 text-violet-900"
                      : "bg-white border-gray-100 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-semibold truncate">{i.name}</div>
                  <div className="text-[10px] text-gray-500 line-clamp-2">
                    {i.prompt}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[11px]">
            <input
              value={itemForm.name}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full text-xs border rounded-md px-2 py-1"
              placeholder="Название сцены"
            />
            <textarea
              value={itemForm.prompt}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, prompt: e.target.value }))
              }
              className="w-full h-20 text-xs border rounded-md px-2 py-1 resize-y"
              placeholder="Prompt для сцены (описание сцены на EN)"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={saveSceneItem}
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {itemForm.id && (
                <button
                  type="button"
                  onClick={deleteSceneItem}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== RENDER POSES UI =====
  const renderPoses = () => (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <ImageIcon className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-gray-800">
            Шаблоны поз (группа → подгруппа → поза)
          </span>
        </div>
        {poseLoading && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Загрузка...
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 border-t border-gray-100">
        {/* Groups */}
        <div className="border-r border-gray-100 flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between border-b">
            <span>Группы поз</span>
            <button
              type="button"
              onClick={() => setGroupForm({ id: null, name: "" })}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {poseGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelectPoseGroup(g)}
                className={[
                  "w-full text-left px-3 py-1.5 border-b text-[11px]",
                  selectedGroupId === g.id
                    ? "bg-violet-50 border-violet-200 text-violet-900"
                    : "bg-white border-gray-100 hover:bg-gray-50",
                ].join(" ")}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[11px]">
            <input
              value={groupForm.name}
              onChange={(e) =>
                setGroupForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full text-xs border rounded-md px-2 py-1"
              placeholder="Название группы поз"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={savePoseGroup}
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {groupForm.id && (
                <button
                  type="button"
                  onClick={deletePoseGroup}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subgroups */}
        <div className="border-r border-gray-100 flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between border-b">
            <span>Подгруппы поз</span>
            <button
              type="button"
              onClick={() =>
                setPoseSubgroupForm({ id: null, name: "" })
              }
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {!selectedGroupId ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                Выберите группу поз.
              </div>
            ) : (
              poseSubgroups.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectPoseSubgroup(s)}
                  className={[
                    "w-full text-left px-3 py-1.5 border-b text-[11px]",
                    selectedSubgroupId === s.id
                      ? "bg-violet-50 border-violet-200 text-violet-900"
                      : "bg-white border-gray-100 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {s.name}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[11px]">
            <input
              value={poseSubgroupForm.name}
              onChange={(e) =>
                setPoseSubgroupForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="w-full text-xs border rounded-md px-2 py-1"
              placeholder="Название подгруппы поз"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={savePoseSubgroup}
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {poseSubgroupForm.id && (
                <button
                  type="button"
                  onClick={deletePoseSubgroup}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prompts */}
        <div className="flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between border-b">
            <span>Позы (prompt)</span>
            <button
              type="button"
              onClick={() =>
                setPosePromptForm({ id: null, name: "", prompt: "" })
              }
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {!selectedSubgroupId ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                Выберите подгруппу поз.
              </div>
            ) : !posePrompts.length ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                Пока нет поз. Добавьте новую.
              </div>
            ) : (
              posePrompts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPosePrompt(p)}
                  className={[
                    "w-full text-left px-3 py-1.5 border-b text-[11px]",
                    posePromptForm.id === p.id
                      ? "bg-violet-50 border-violet-200 text-violet-900"
                      : "bg-white border-gray-100 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-[10px] text-gray-500 line-clamp-2">
                    {p.prompt}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[11px]">
            <input
              value={posePromptForm.name}
              onChange={(e) =>
                setPosePromptForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="w-full text-xs border rounded-md px-2 py-1"
              placeholder="Название позы"
            />
            <textarea
              value={posePromptForm.prompt}
              onChange={(e) =>
                setPosePromptForm((prev) => ({
                  ...prev,
                  prompt: e.target.value,
                }))
              }
              className="w-full h-20 text-xs border rounded-md px-2 py-1 resize-y"
              placeholder="Prompt для позы (описание позы на EN)"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={savePosePrompt}
                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
              {posePromptForm.id && (
                <button
                  type="button"
                  onClick={deletePosePrompt}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Local header for photo admin */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2 text-xs">
          <ImageIcon className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-gray-900">
            Фото-шаблоны для генерации
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveMode("scenes")}
            className={[
              "px-3 py-1 rounded-full border",
              activeMode === "scenes"
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
            ].join(" ")}
          >
            Сцены
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("poses")}
            className={[
              "px-3 py-1 rounded-full border",
              activeMode === "poses"
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
            ].join(" ")}
          >
            Позы
          </button>
        </div>
      </div>

      {activeMode === "scenes" ? renderScenes() : renderPoses()}
    </div>
  );
}
