// ============================================
// FILE 1: src/components/PhotoAiEditor.jsx
// ============================================

import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { api } from "../api/client";

const TABS = [
  { key: "scene", label: "Сцена" },
  { key: "pose", label: "Поза" },
  { key: "custom", label: "Свой промпт" },
];

function getUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    if (item.url) return item.url;
    if (item.src) return item.src;
  }
  return "";
}

function getKey(item, idx) {
  if (item && typeof item === "object") {
    return item.id || item._id || item.url || idx;
  }
  if (typeof item === "string") return item || idx;
  return idx;
}

export default function PhotoAiEditor({ token, urls = [], onAddPhoto, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeUrl = getUrl(urls[activeIndex]);

  const [activeTab, setActiveTab] = useState("scene");
  const [loading, setLoading] = useState(false);

  // ===== SCENE STATE =====
  const [sceneCategories, setSceneCategories] = useState([]);
  const [sceneSubcats, setSceneSubcats] = useState([]);
  const [sceneItems, setSceneItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");
  const [selectedItem, setSelectedItem] = useState("");

  // ===== POSE STATE =====
  const [poseGroups, setPoseGroups] = useState([]);
  const [poseSubgroups, setPoseSubgroups] = useState([]);
  const [posePrompts, setPosePrompts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSubgroup, setSelectedSubgroup] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");

  // Custom prompt
  const [customPrompt, setCustomPrompt] = useState("");

  // URLs o'zgarganda activeIndex diapazondan chiqib ketmasin
  useEffect(() => {
    if (!urls.length) {
      setActiveIndex(0);
    } else if (activeIndex >= urls.length) {
      setActiveIndex(0);
    }
  }, [urls, activeIndex]);

  // ==== LOAD SCENE / POSE SPRAVOCHNIKLAR ====
  useEffect(() => {
    if (!token) return;

    if (activeTab === "scene") {
      api.photo.scenes
        .listCategories(token)
        .then((data) => setSceneCategories(data || []))
        .catch((e) => console.error("Scene categories error:", e));
    }

    if (activeTab === "pose") {
      api.photo.poses
        .listGroups(token)
        .then((data) => setPoseGroups(data || []))
        .catch((e) => console.error("Pose groups error:", e));
    }
  }, [activeTab, token]);

  // ==== SCENE HANDLERS ====
  const onChangeCategory = async (catId) => {
    setSelectedCat(catId);
    setSelectedSubcat("");
    setSelectedItem("");
    setSceneSubcats([]);
    setSceneItems([]);
    if (!catId) return;

    try {
      const data = await api.photo.scenes.listSubcategories(token, catId);
      setSceneSubcats(data || []);
    } catch (e) {
      console.error("Scene subcats error:", e);
    }
  };

  const onChangeSubcat = async (subId) => {
    setSelectedSubcat(subId);
    setSelectedItem("");
    setSceneItems([]);
    if (!subId) return;

    try {
      const data = await api.photo.scenes.listItems(token, subId);
      setSceneItems(data || []);
    } catch (e) {
      console.error("Scene items error:", e);
    }
  };

  // ==== POSE HANDLERS ====
  const onChangePoseGroup = async (groupId) => {
    setSelectedGroup(groupId);
    setSelectedSubgroup("");
    setSelectedPrompt("");
    setPoseSubgroups([]);
    setPosePrompts([]);
    if (!groupId) return;

    try {
      const data = await api.photo.poses.listSubgroups(token, groupId);
      setPoseSubgroups(data || []);
    } catch (e) {
      console.error("Pose subgroups error:", e);
    }
  };

  const onChangePoseSubgroup = async (subId) => {
    setSelectedSubgroup(subId);
    setSelectedPrompt("");
    setPosePrompts([]);
    if (!subId) return;

    try {
      const data = await api.photo.poses.listPrompts(token, subId);
      setPosePrompts(data || []);
    } catch (e) {
      console.error("Pose prompts error:", e);
    }
  };

  // ==== GENERATE ====
  const handleGenerate = async () => {
    if (!token) return;
    const imageUrl = getUrl(urls[activeIndex]);
    if (!imageUrl) return;

    setLoading(true);
    try {
        let data;

        if (activeTab === "scene") {
        if (!selectedItem) {
            alert("Выберите сцену");
            setLoading(false);
            return;
        }
        data = await api.photo.generateScene(token, {
            photo_url: imageUrl,               // ⬅️ MUHIM
            item_id: Number(selectedItem),
        });
        } else if (activeTab === "pose") {
        if (!selectedPrompt) {
            alert("Выберите позу");
            setLoading(false);
            return;
        }
        data = await api.photo.generatePose(token, {
            photo_url: imageUrl,               // ⬅️ MUHIM
            prompt_id: Number(selectedPrompt),
        });
        } else {
        if (!customPrompt.trim()) {
            alert("Введите промпт");
            setLoading(false);
            return;
        }
        data = await api.photo.generateCustom(token, {
            photo_url: imageUrl,               // ⬅️ MUHIM
            prompt: customPrompt,
            // translate_to_en default true bo'ladi, istasang aniq yozib qo'y:
            // translate_to_en: true,
        });
        }

        const newBase64 = data.image_base64;
        if (newBase64 && onAddPhoto) {
        // agar sen URL sifatida saqlamoqchi bo'lsang, data URL qilib ber:
        const dataUrl = `data:image/png;base64,${newBase64}`;
        onAddPhoto(dataUrl);
        }

        onClose && onClose();
    } catch (e) {
        console.error(e);
        alert("Ошибка генерации: " + (e.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
    };

  const label =
    typeof activeUrl === "string" && activeUrl.length > 0
      ? activeUrl.slice(0, 60) + "..."
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  activeTab === t.key
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* LEFT: thumbnails */}
          <div className="col-span-4 border-r border-gray-100 pr-3 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">
              Фото товара ({urls.length})
            </h3>
            {urls.length ? (
              <div className="grid grid-cols-2 gap-3">
                {urls.map((item, idx) => {
                  const url = getUrl(item);
                  const key = getKey(item, idx);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={[
                        "aspect-square cursor-pointer rounded-xl border-2 overflow-hidden transition-all",
                        idx === activeIndex
                          ? "border-violet-500 ring-2 ring-violet-300"
                          : "border-gray-200 hover:border-violet-300",
                      ].join(" ")}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={`Фото ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                          Нет превью
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Нет фотографий. Сначала загрузите фото в карточку.
              </div>
            )}
          </div>

          {/* RIGHT: Preview + Controls */}
          <div className="col-span-8 flex flex-col gap-4 overflow-y-auto">
            {/* Preview */}
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden min-h-[200px]">
              {activeUrl ? (
                <img
                  src={activeUrl}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">
                  Выберите фото слева
                </span>
              )}
            </div>

            {/* Controls (scene / pose / custom) */}
            <div className="space-y-3">
              {activeTab === "scene" && (
                <>
                  <select
                    value={selectedCat}
                    onChange={(e) => onChangeCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="">Выберите категорию сцены</option>
                    {sceneCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {selectedCat && sceneSubcats.length > 0 && (
                    <select
                      value={selectedSubcat}
                      onChange={(e) => onChangeSubcat(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">Выберите подкатегорию</option>
                      {sceneSubcats.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedSubcat && sceneItems.length > 0 && (
                    <select
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">Выберите сцену</option>
                      {sceneItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {activeTab === "pose" && (
                <>
                  <select
                    value={selectedGroup}
                    onChange={(e) => onChangePoseGroup(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="">Выберите группу поз</option>
                    {poseGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  {selectedGroup && poseSubgroups.length > 0 && (
                    <select
                      value={selectedSubgroup}
                      onChange={(e) => onChangePoseSubgroup(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">Выберите подгруппу</option>
                      {poseSubgroups.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedSubgroup && posePrompts.length > 0 && (
                    <select
                      value={selectedPrompt}
                      onChange={(e) => setSelectedPrompt(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">Выберите позу</option>
                      {posePrompts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {activeTab === "custom" && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Введите свой промпт для генерации..."
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px] resize-y"
                />
              )}
            </div>

            {/* FOOTER */}
            <div className="pt-3 mt-1 border-t flex items-center justify-between">
              <span className="text-[11px] text-gray-500 truncate">
                Источник фото: {label}
              </span>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !activeUrl}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-violet-700"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Генерация..." : "Сгенерировать новый вариант"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}