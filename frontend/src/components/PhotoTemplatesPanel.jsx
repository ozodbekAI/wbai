// src/components/PhotoTemplatesPanel.jsx

import { useEffect, useState } from "react";
import { X, Image as ImageIcon, Plus, Save, Trash2, Loader2 } from "lucide-react";
import { api } from "../api/client";

const TABS = [
  { key: "scenes", label: "Сцены (фон/локация)" },
  { key: "poses", label: "Позы модели" },
];

export default function PhotoTemplatesPanel({ open, onClose, token }) {
  const [activeTab, setActiveTab] = useState("scenes");

  // ==== SCENES STATE ====
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneCategories, setSceneCategories] = useState([]);
  const [sceneSubcats, setSceneSubcats] = useState([]);
  const [sceneItems, setSceneItems] = useState([]);

  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedSubcatId, setSelectedSubcatId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  const [sceneCatForm, setSceneCatForm] = useState({ id: null, name: "", order_index: 0 });
  const [sceneSubcatForm, setSceneSubcatForm] = useState({ id: null, name: "", order_index: 0 });
  const [sceneItemForm, setSceneItemForm] = useState({
    id: null,
    name: "",
    prompt: "",
    order_index: 0,
  });

  // ==== POSES STATE ====
  const [poseLoading, setPoseLoading] = useState(false);
  const [poseGroups, setPoseGroups] = useState([]);
  const [poseSubgroups, setPoseSubgroups] = useState([]);
  const [posePrompts, setPosePrompts] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSubgroupId, setSelectedSubgroupId] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("");

  const [poseGroupForm, setPoseGroupForm] = useState({ id: null, name: "", order_index: 0 });
  const [poseSubgroupForm, setPoseSubgroupForm] = useState({ id: null, name: "", order_index: 0 });
  const [posePromptForm, setPosePromptForm] = useState({
    id: null,
    name: "",
    prompt: "",
    order_index: 0,
  });

  // ================= SCENES LOADERS =================

  const loadSceneCategories = async (keepSelection = false) => {
    if (!token) return;
    setSceneLoading(true);
    try {
      const cats = await api.photo.scenes.listCategories(token);
      setSceneCategories(cats || []);

      if (!cats?.length) {
        setSelectedCatId("");
        setSceneCatForm({ id: null, name: "", order_index: 0 });
        setSceneSubcats([]);
        setSceneItems([]);
        setSelectedSubcatId("");
        setSelectedItemId("");
        return;
      }

      let catToSelect = cats[0];
      if (keepSelection) {
        const existing = cats.find((c) => c.id === Number(selectedCatId));
        if (existing) catToSelect = existing;
      }

      await handleSelectSceneCategory(catToSelect.id, cats, keepSelection);
    } finally {
      setSceneLoading(false);
    }
  };

  const handleSelectSceneCategory = async (
    catId,
    catsFromState = null,
    keepSubSelection = false
  ) => {
    const cats = catsFromState || sceneCategories;
    const cat = cats.find((c) => c.id === Number(catId));
    if (!cat) return;

    setSelectedCatId(cat.id);
    setSceneCatForm({
      id: cat.id,
      name: cat.name || "",
      order_index: cat.order_index ?? 0,
    });

    // reset sub-levels
    setSceneItems([]);
    setSelectedItemId("");
    setSceneItemForm({ id: null, name: "", prompt: "", order_index: 0 });

    const subs = await api.photo.scenes.listSubcategories(token, cat.id);
    setSceneSubcats(subs || []);

    if (!subs?.length) {
      setSelectedSubcatId("");
      setSceneSubcatForm({ id: null, name: "", order_index: 0 });
      return;
    }

    let subToSelect = subs[0];
    if (keepSubSelection) {
      const existing = subs.find((s) => s.id === Number(selectedSubcatId));
      if (existing) subToSelect = existing;
    }
    await handleSelectSceneSubcategory(subToSelect.id, subs);
  };

  const handleSelectSceneSubcategory = async (subId, subsFromState = null) => {
    const subs = subsFromState || sceneSubcats;
    const sub = subs.find((s) => s.id === Number(subId));
    if (!sub) return;

    setSelectedSubcatId(sub.id);
    setSceneSubcatForm({
      id: sub.id,
      name: sub.name || "",
      order_index: sub.order_index ?? 0,
    });

    const items = await api.photo.scenes.listItems(token, sub.id);
    setSceneItems(items || []);

    if (!items?.length) {
      setSelectedItemId("");
      setSceneItemForm({ id: null, name: "", prompt: "", order_index: 0 });
      return;
    }

    const it = items.find((i) => i.id === Number(selectedItemId)) || items[0];
    handleSelectSceneItem(it.id, items);
  };

  const handleSelectSceneItem = (itemId, itemsFromState = null) => {
    const items = itemsFromState || sceneItems;
    const it = items.find((i) => i.id === Number(itemId));
    if (!it) return;

    setSelectedItemId(it.id);
    setSceneItemForm({
      id: it.id,
      name: it.name || "",
      prompt: it.prompt || "",
      order_index: it.order_index ?? 0,
    });
  };

  // ================= POSES LOADERS =================

  const loadPoseGroups = async (keepSelection = false) => {
    if (!token) return;
    setPoseLoading(true);
    try {
      const groups = await api.photo.poses.listGroups(token);
      setPoseGroups(groups || []);

      if (!groups?.length) {
        setSelectedGroupId("");
        setPoseGroupForm({ id: null, name: "", order_index: 0 });
        setPoseSubgroups([]);
        setPosePrompts([]);
        setSelectedSubgroupId("");
        setSelectedPromptId("");
        return;
      }

      let groupToSelect = groups[0];
      if (keepSelection) {
        const existing = groups.find((g) => g.id === Number(selectedGroupId));
        if (existing) groupToSelect = existing;
      }

      await handleSelectPoseGroup(groupToSelect.id, groups, keepSelection);
    } finally {
      setPoseLoading(false);
    }
  };

  const handleSelectPoseGroup = async (
    groupId,
    groupsFromState = null,
    keepSubSelection = false
  ) => {
    const groups = groupsFromState || poseGroups;
    const group = groups.find((g) => g.id === Number(groupId));
    if (!group) return;

    setSelectedGroupId(group.id);
    setPoseGroupForm({
      id: group.id,
      name: group.name || "",
      order_index: group.order_index ?? 0,
    });

    setPosePrompts([]);
    setSelectedPromptId("");
    setPosePromptForm({ id: null, name: "", prompt: "", order_index: 0 });

    const subs = await api.photo.poses.listSubgroups(token, group.id);
    setPoseSubgroups(subs || []);

    if (!subs?.length) {
      setSelectedSubgroupId("");
      setPoseSubgroupForm({ id: null, name: "", order_index: 0 });
      return;
    }

    let subToSelect = subs[0];
    if (keepSubSelection) {
      const existing = subs.find((s) => s.id === Number(selectedSubgroupId));
      if (existing) subToSelect = existing;
    }

    await handleSelectPoseSubgroup(subToSelect.id, subs);
  };

  const handleSelectPoseSubgroup = async (subId, subsFromState = null) => {
    const subs = subsFromState || poseSubgroups;
    const sub = subs.find((s) => s.id === Number(subId));
    if (!sub) return;

    setSelectedSubgroupId(sub.id);
    setPoseSubgroupForm({
      id: sub.id,
      name: sub.name || "",
      order_index: sub.order_index ?? 0,
    });

    const prompts = await api.photo.poses.listPrompts(token, sub.id);
    setPosePrompts(prompts || []);

    if (!prompts?.length) {
      setSelectedPromptId("");
      setPosePromptForm({ id: null, name: "", prompt: "", order_index: 0 });
      return;
    }

    const p = prompts.find((pr) => pr.id === Number(selectedPromptId)) || prompts[0];
    handleSelectPosePrompt(p.id, prompts);
  };

  const handleSelectPosePrompt = (promptId, promptsFromState = null) => {
    const prompts = promptsFromState || posePrompts;
    const p = prompts.find((pr) => pr.id === Number(promptId));
    if (!p) return;

    setSelectedPromptId(p.id);
    setPosePromptForm({
      id: p.id,
      name: p.name || "",
      prompt: p.prompt || "",
      order_index: p.order_index ?? 0,
    });
  };

  // ================= EFFECTS =================

  useEffect(() => {
    if (!open || !token) return;
    if (activeTab === "scenes") {
      loadSceneCategories(true);
    } else {
      loadPoseGroups(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, token]);

  if (!open) return null;

  // ================= SCENE HANDLERS (CRUD) =================

  const handleSceneCatNew = () => {
    setSelectedCatId("");
    setSceneCatForm({ id: null, name: "", order_index: (sceneCategories.length || 0) + 1 });
    setSceneSubcats([]);
    setSceneItems([]);
    setSelectedSubcatId("");
    setSelectedItemId("");
  };

  const handleSceneCatSave = async () => {
    if (!sceneCatForm.name.trim()) {
      alert("Название категории обязательно");
      return;
    }
    try {
      if (sceneCatForm.id) {
        await api.photo.scenes.updateCategory(token, sceneCatForm.id, {
          name: sceneCatForm.name,
          order_index: Number(sceneCatForm.order_index) || 0,
        });
      } else {
        await api.photo.scenes.createCategory(token, {
          name: sceneCatForm.name,
          order_index: Number(sceneCatForm.order_index) || 0,
        });
      }
      await loadSceneCategories(true);
      alert("Категория сохранена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения категории");
    }
  };

  const handleSceneCatDelete = async () => {
    if (!sceneCatForm.id) return;
    if (!window.confirm("Удалить категорию со всеми подкатегориями и сценами?")) return;
    try {
      await api.photo.scenes.deleteCategory(token, sceneCatForm.id);
      await loadSceneCategories(false);
      alert("Категория удалена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления категории");
    }
  };

  const handleSceneSubcatNew = () => {
    if (!selectedCatId) {
      alert("Сначала выберите категорию");
      return;
    }
    setSelectedSubcatId("");
    setSceneSubcatForm({
      id: null,
      name: "",
      order_index: (sceneSubcats.length || 0) + 1,
    });
    setSceneItems([]);
    setSelectedItemId("");
  };

  const handleSceneSubcatSave = async () => {
    if (!selectedCatId) {
      alert("Сначала выберите категорию");
      return;
    }
    if (!sceneSubcatForm.name.trim()) {
      alert("Название подкатегории обязательно");
      return;
    }
    try {
      if (sceneSubcatForm.id) {
        await api.photo.scenes.updateSubcategory(token, sceneSubcatForm.id, {
          name: sceneSubcatForm.name,
          order_index: Number(sceneSubcatForm.order_index) || 0,
        });
      } else {
        await api.photo.scenes.createSubcategory(token, selectedCatId, {
          name: sceneSubcatForm.name,
          order_index: Number(sceneSubcatForm.order_index) || 0,
        });
      }
      await handleSelectSceneCategory(selectedCatId, null, true);
      alert("Подкатегория сохранена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения подкатегории");
    }
  };

  const handleSceneSubcatDelete = async () => {
    if (!sceneSubcatForm.id) return;
    if (!window.confirm("Удалить подкатегорию со всеми сценами?")) return;
    try {
      await api.photo.scenes.deleteSubcategory(token, sceneSubcatForm.id);
      await handleSelectSceneCategory(selectedCatId, null, false);
      alert("Подкатегория удалена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления подкатегории");
    }
  };

  const handleSceneItemNew = () => {
    if (!selectedSubcatId) {
      alert("Сначала выберите подкатегорию");
      return;
    }
    setSelectedItemId("");
    setSceneItemForm({
      id: null,
      name: "",
      prompt: "",
      order_index: (sceneItems.length || 0) + 1,
    });
  };

  const handleSceneItemSave = async () => {
    if (!selectedSubcatId) {
      alert("Сначала выберите подкатегорию");
      return;
    }
    if (!sceneItemForm.name.trim()) {
      alert("Название сцены обязательно");
      return;
    }
    if (!sceneItemForm.prompt.trim()) {
      alert("Prompt для сцены обязателен");
      return;
    }
    try {
      if (sceneItemForm.id) {
        await api.photo.scenes.updateItem(token, sceneItemForm.id, {
          name: sceneItemForm.name,
          prompt: sceneItemForm.prompt,
          order_index: Number(sceneItemForm.order_index) || 0,
        });
      } else {
        await api.photo.scenes.createItem(token, selectedSubcatId, {
          name: sceneItemForm.name,
          prompt: sceneItemForm.prompt,
          order_index: Number(sceneItemForm.order_index) || 0,
        });
      }
      await handleSelectSceneSubcategory(selectedSubcatId, null);
      alert("Сцена сохранена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения сцены");
    }
  };

  const handleSceneItemDelete = async () => {
    if (!sceneItemForm.id) return;
    if (!window.confirm("Удалить сцену?")) return;
    try {
      await api.photo.scenes.deleteItem(token, sceneItemForm.id);
      await handleSelectSceneSubcategory(selectedSubcatId, null);
      alert("Сцена удалена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления сцены");
    }
  };

  // ================= POSE HANDLERS (CRUD) =================

  const handlePoseGroupNew = () => {
    setSelectedGroupId("");
    setPoseGroupForm({
      id: null,
      name: "",
      order_index: (poseGroups.length || 0) + 1,
    });
    setPoseSubgroups([]);
    setPosePrompts([]);
    setSelectedSubgroupId("");
    setSelectedPromptId("");
  };

  const handlePoseGroupSave = async () => {
    if (!poseGroupForm.name.trim()) {
      alert("Название группы обязательно");
      return;
    }
    try {
      if (poseGroupForm.id) {
        await api.photo.poses.updateGroup(token, poseGroupForm.id, {
          name: poseGroupForm.name,
          order_index: Number(poseGroupForm.order_index) || 0,
        });
      } else {
        await api.photo.poses.createGroup(token, {
          name: poseGroupForm.name,
          order_index: Number(poseGroupForm.order_index) || 0,
        });
      }
      await loadPoseGroups(true);
      alert("Группа поз сохранена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения группы");
    }
  };

  const handlePoseGroupDelete = async () => {
    if (!poseGroupForm.id) return;
    if (!window.confirm("Удалить группу со всеми подгруппами и позами?")) return;
    try {
      await api.photo.poses.deleteGroup(token, poseGroupForm.id);
      await loadPoseGroups(false);
      alert("Группа удалена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления группы");
    }
  };

  const handlePoseSubgroupNew = () => {
    if (!selectedGroupId) {
      alert("Сначала выберите группу");
      return;
    }
    setSelectedSubgroupId("");
    setPoseSubgroupForm({
      id: null,
      name: "",
      order_index: (poseSubgroups.length || 0) + 1,
    });
    setPosePrompts([]);
    setSelectedPromptId("");
  };

  const handlePoseSubgroupSave = async () => {
    if (!selectedGroupId) {
      alert("Сначала выберите группу");
      return;
    }
    if (!poseSubgroupForm.name.trim()) {
      alert("Название подгруппы обязательно");
      return;
    }
    try {
      if (poseSubgroupForm.id) {
        await api.photo.poses.updateSubgroup(token, poseSubgroupForm.id, {
          name: poseSubgroupForm.name,
          order_index: Number(poseSubgroupForm.order_index) || 0,
        });
      } else {
        await api.photo.poses.createSubgroup(token, selectedGroupId, {
          name: poseSubgroupForm.name,
          order_index: Number(poseSubgroupForm.order_index) || 0,
        });
      }
      await handleSelectPoseGroup(selectedGroupId, null, true);
      alert("Подгруппа сохранена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения подгруппы");
    }
  };

  const handlePoseSubgroupDelete = async () => {
    if (!poseSubgroupForm.id) return;
    if (!window.confirm("Удалить подгруппу со всеми позами?")) return;
    try {
      await api.photo.poses.deleteSubgroup(token, poseSubgroupForm.id);
      await handleSelectPoseGroup(selectedGroupId, null, false);
      alert("Подгруппа удалена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления подгруппы");
    }
  };

  const handlePosePromptNew = () => {
    if (!selectedSubgroupId) {
      alert("Сначала выберите подгруппу");
      return;
    }
    setSelectedPromptId("");
    setPosePromptForm({
      id: null,
      name: "",
      prompt: "",
      order_index: (posePrompts.length || 0) + 1,
    });
  };

  const handlePosePromptSave = async () => {
    if (!selectedSubgroupId) {
      alert("Сначала выберите подгруппу");
      return;
    }
    if (!posePromptForm.name.trim()) {
      alert("Название позы обязательно");
      return;
    }
    if (!posePromptForm.prompt.trim()) {
      alert("Prompt для позы обязателен");
      return;
    }
    try {
      if (posePromptForm.id) {
        await api.photo.poses.updatePrompt(token, posePromptForm.id, {
          name: posePromptForm.name,
          prompt: posePromptForm.prompt,
          order_index: Number(posePromptForm.order_index) || 0,
        });
      } else {
        await api.photo.poses.createPrompt(token, selectedSubgroupId, {
          name: posePromptForm.name,
          prompt: posePromptForm.prompt,
          order_index: Number(posePromptForm.order_index) || 0,
        });
      }
      await handleSelectPoseSubgroup(selectedSubgroupId, null);
      alert("Поза сохранена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка сохранения позы");
    }
  };

  const handlePosePromptDelete = async () => {
    if (!posePromptForm.id) return;
    if (!window.confirm("Удалить позу?")) return;
    try {
      await api.photo.poses.deletePrompt(token, posePromptForm.id);
      await handleSelectPoseSubgroup(selectedSubgroupId, null);
      alert("Поза удалена");
    } catch (e) {
      console.error(e);
      alert(e.message || "Ошибка удаления позы");
    }
  };

  // ================= RENDER =================

  const renderScenesTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
      {sceneLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка сцен...
        </div>
      )}

      {/* CATEGORY */}
      <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-xs">
            Категория сцены
          </span>
          <button
            type="button"
            onClick={handleSceneCatNew}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3" />
            Новая
          </button>
        </div>
        <select
          className="w-full border rounded-md px-2 py-1 text-xs bg-white"
          value={selectedCatId || ""}
          onChange={(e) => handleSelectSceneCategory(Number(e.target.value))}
        >
          <option value="">— выберите категорию —</option>
          {sceneCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[11px] text-gray-500">
              Название
            </label>
            <input
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={sceneCatForm.name}
              onChange={(e) =>
                setSceneCatForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">
              Порядок (order_index)
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={sceneCatForm.order_index}
              onChange={(e) =>
                setSceneCatForm((prev) => ({
                  ...prev,
                  order_index: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleSceneCatSave}
            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <Save className="w-3 h-3" />
            Сохранить
          </button>
          {sceneCatForm.id && (
            <button
              type="button"
              onClick={handleSceneCatDelete}
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* SUBCATEGORY */}
      <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-xs">
            Подкатегория
          </span>
          <button
            type="button"
            onClick={handleSceneSubcatNew}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3" />
            Новая
          </button>
        </div>
        <select
          className="w-full border rounded-md px-2 py-1 text-xs bg-white"
          value={selectedSubcatId || ""}
          onChange={(e) => handleSelectSceneSubcategory(Number(e.target.value))}
          disabled={!selectedCatId}
        >
          <option value="">— выберите подкатегорию —</option>
          {sceneSubcats.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[11px] text-gray-500">
              Название
            </label>
            <input
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={sceneSubcatForm.name}
              onChange={(e) =>
                setSceneSubcatForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              disabled={!selectedCatId && !sceneSubcatForm.id}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">
              Порядок
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={sceneSubcatForm.order_index}
              onChange={(e) =>
                setSceneSubcatForm((prev) => ({
                  ...prev,
                  order_index: e.target.value,
                }))
              }
              disabled={!selectedCatId && !sceneSubcatForm.id}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleSceneSubcatSave}
            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <Save className="w-3 h-3" />
            Сохранить
          </button>
          {sceneSubcatForm.id && (
            <button
              type="button"
              onClick={handleSceneSubcatDelete}
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* SCENE ITEM */}
      <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-xs">
            Конкретная сцена (item)
          </span>
          <button
            type="button"
            onClick={handleSceneItemNew}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3" />
            Новая
          </button>
        </div>
        <select
          className="w-full border rounded-md px-2 py-1 text-xs bg-white"
          value={selectedItemId || ""}
          onChange={(e) => handleSelectSceneItem(Number(e.target.value))}
          disabled={!selectedSubcatId}
        >
          <option value="">— выберите сцену —</option>
          {sceneItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[11px] text-gray-500">
              Название
            </label>
            <input
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={sceneItemForm.name}
              onChange={(e) =>
                setSceneItemForm((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={!selectedSubcatId && !sceneItemForm.id}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">
              Порядок
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={sceneItemForm.order_index}
              onChange={(e) =>
                setSceneItemForm((prev) => ({
                  ...prev,
                  order_index: e.target.value,
                }))
              }
              disabled={!selectedSubcatId && !sceneItemForm.id}
            />
          </div>
        </div>

        <div className="mt-2">
          <label className="block text-[11px] text-gray-500">
            Prompt сцены (на русском, подробно)
          </label>
          <textarea
            className="w-full border rounded-md px-2 py-1 text-xs min-h-[80px]"
            value={sceneItemForm.prompt}
            onChange={(e) =>
              setSceneItemForm((prev) => ({
                ...prev,
                prompt: e.target.value,
              }))
            }
            disabled={!selectedSubcatId && !sceneItemForm.id}
          />
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleSceneItemSave}
            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <Save className="w-3 h-3" />
            Сохранить
          </button>
          {sceneItemForm.id && (
            <button
              type="button"
              onClick={handleSceneItemDelete}
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderPosesTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
      {poseLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка поз...
        </div>
      )}

      {/* GROUP */}
      <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-xs">
            Группа поз
          </span>
          <button
            type="button"
            onClick={handlePoseGroupNew}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3" />
            Новая
          </button>
        </div>
        <select
          className="w-full border rounded-md px-2 py-1 text-xs bg-white"
          value={selectedGroupId || ""}
          onChange={(e) => handleSelectPoseGroup(Number(e.target.value))}
        >
          <option value="">— выберите группу —</option>
          {poseGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[11px] text-gray-500">
              Название
            </label>
            <input
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={poseGroupForm.name}
              onChange={(e) =>
                setPoseGroupForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">
              Порядок
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={poseGroupForm.order_index}
              onChange={(e) =>
                setPoseGroupForm((prev) => ({
                  ...prev,
                  order_index: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handlePoseGroupSave}
            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <Save className="w-3 h-3" />
            Сохранить
          </button>
          {poseGroupForm.id && (
            <button
              type="button"
              onClick={handlePoseGroupDelete}
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* SUBGROUP */}
      <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-xs">
            Подгруппа поз
          </span>
          <button
            type="button"
            onClick={handlePoseSubgroupNew}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3" />
            Новая
          </button>
        </div>
        <select
          className="w-full border rounded-md px-2 py-1 text-xs bg-white"
          value={selectedSubgroupId || ""}
          onChange={(e) => handleSelectPoseSubgroup(Number(e.target.value))}
          disabled={!selectedGroupId}
        >
          <option value="">— выберите подгруппу —</option>
          {poseSubgroups.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[11px] text-gray-500">
              Название
            </label>
            <input
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={poseSubgroupForm.name}
              onChange={(e) =>
                setPoseSubgroupForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">
              Порядок
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={poseSubgroupForm.order_index}
              onChange={(e) =>
                setPoseSubgroupForm((prev) => ({
                  ...prev,
                  order_index: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handlePoseSubgroupSave}
            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <Save className="w-3 h-3" />
            Сохранить
          </button>
          {poseSubgroupForm.id && (
            <button
              type="button"
              onClick={handlePoseSubgroupDelete}
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* PROMPT */}
      <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-xs">
            Поза (prompt)
          </span>
          <button
            type="button"
            onClick={handlePosePromptNew}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3" />
            Новая
          </button>
        </div>
        <select
          className="w-full border rounded-md px-2 py-1 text-xs bg-white"
          value={selectedPromptId || ""}
          onChange={(e) => handleSelectPosePrompt(Number(e.target.value))}
          disabled={!selectedSubgroupId}
        >
          <option value="">— выберите позу —</option>
          {posePrompts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[11px] text-gray-500">
              Название
            </label>
            <input
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={posePromptForm.name}
              onChange={(e) =>
                setPosePromptForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">
              Порядок
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-2 py-1 text-xs"
              value={posePromptForm.order_index}
              onChange={(e) =>
                setPosePromptForm((prev) => ({
                  ...prev,
                  order_index: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-[11px] text-gray-500">
            Prompt позы (на русском)
          </label>
          <textarea
            className="w-full border rounded-md px-2 py-1 text-xs min-h-[80px]"
            value={posePromptForm.prompt}
            onChange={(e) =>
              setPosePromptForm((prev) => ({
                ...prev,
                prompt: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handlePosePromptSave}
            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <Save className="w-3 h-3" />
            Сохранить
          </button>
          {posePromptForm.id && (
            <button
              type="button"
              onClick={handlePosePromptDelete}
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );

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
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Фото-шаблоны (сцены и позы)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* tabs */}
        <div className="px-4 py-2 border-b flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium ${
                activeTab === t.key
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* content */}
        {activeTab === "scenes" ? renderScenesTab() : renderPosesTab()}
      </aside>
    </div>
  );
}
