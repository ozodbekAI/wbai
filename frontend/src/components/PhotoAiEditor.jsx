// frontend/src/components/PhotoAiEditor.jsx

import { useEffect, useState, useRef } from "react";
import { X, Sparkles, Upload, Trash2, Plus, Film, Zap } from "lucide-react";
import { api } from "../api/client";

const TABS = [
  { key: "scene", label: "Сцена" },
  { key: "pose", label: "Поза" },
  { key: "custom", label: "Свой промпт" },
  { key: "enhance", label: "Улучшить фото" },
  { key: "video", label: "Создать видео" },
];

function getUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.src || "";
}

export default function PhotoStudio({
  token,
  cardPhotos = [],
  onUpdateCardPhotos,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("scene");
  const [loading, setLoading] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [generatedPhotos, setGeneratedPhotos] = useState([]);

  const fileInputRef = useRef(null);
  const centerFileInputRef = useRef(null);

  // Scene state
  const [sceneCategories, setSceneCategories] = useState([]);
  const [sceneSubcats, setSceneSubcats] = useState([]);
  const [sceneItems, setSceneItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");
  const [selectedItem, setSelectedItem] = useState("");

  // Pose state
  const [poseGroups, setPoseGroups] = useState([]);
  const [poseSubgroups, setPoseSubgroups] = useState([]);
  const [posePrompts, setPosePrompts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSubgroup, setSelectedSubgroup] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");

  // Custom/Enhance/Video
  const [customPrompt, setCustomPrompt] = useState("");
  const [enhanceLevel, setEnhanceLevel] = useState("medium");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState(5);

  // Load generated from localStorage
  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("photoStudio_generated") || "[]"
    );
    setGeneratedPhotos(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "photoStudio_generated",
      JSON.stringify(generatedPhotos)
    );
  }, [generatedPhotos]);

  // Load scene/pose data from backend
  useEffect(() => {
    if (!token) return;

    if (activeTab === "scene") {
      api.photo.scenes
        .listCategories(token)
        .then(setSceneCategories)
        .catch(console.error);
    }

    if (activeTab === "pose") {
      api.photo.poses
        .listGroups(token)
        .then(setPoseGroups)
        .catch(console.error);
    }
  }, [activeTab, token]);

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
      console.error(e);
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
      console.error(e);
    }
  };

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
      console.error(e);
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
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!token) return;

    const activeItem = cardPhotos[selectedCardIndex];
    if (!activeItem) {
      alert("Выберите фото слева");
      return;
    }

    setLoading(true);
    try {
      // 🔹 1. Agar bu WB dan kelgan eski rasm bo‘lsa – URL tayyor
      // 🔹 2. Agar bu yangi yuklangan rasm bo‘lsa (file bor) – avval backendga upload qilamiz
      let imageUrl = "";

      if (activeItem.file) {
        const uploadRes = await api.photo.uploadPhoto(token, activeItem.file);
        imageUrl = uploadRes.file_url;
      } else {
        imageUrl = getUrl(activeItem);
      }

      if (!imageUrl) {
        throw new Error("Некорректный URL изображения");
      }

      let data;

      if (activeTab === "scene") {
        if (!selectedItem) {
          alert("Выберите сцену");
          setLoading(false);
          return;
        }
        data = await api.photo.generateScene(token, {
          photo_url: imageUrl,
          item_id: Number(selectedItem),
        });
      } else if (activeTab === "pose") {
        if (!selectedPrompt) {
          alert("Выберите позу");
          setLoading(false);
          return;
        }
        data = await api.photo.generatePose(token, {
          photo_url: imageUrl,
          prompt_id: Number(selectedPrompt),
        });
      } else if (activeTab === "custom") {
        if (!customPrompt.trim()) {
          alert("Введите промпт");
          setLoading(false);
          return;
        }
        data = await api.photo.generateCustom(token, {
          photo_url: imageUrl,
          prompt: customPrompt,
        });
      } else if (activeTab === "enhance") {
        data = await api.photo.enhancePhoto(token, {
          photo_url: imageUrl,
          level: enhanceLevel,
        });
      } else if (activeTab === "video") {
        if (!videoPrompt.trim()) {
          alert("Введите описание видео");
          setLoading(false);
          return;
        }
        data = await api.photo.generateVideo(token, {
          photo_url: imageUrl,
          prompt: videoPrompt,
          duration: videoDuration,
        });
      }

      const newItem = {
        id: Date.now(),
        url:
          activeTab === "video"
            ? `data:video/mp4;base64,${data.video_base64}`
            : `data:image/png;base64,${data.image_base64}`,
        type: activeTab === "video" ? "video" : "image",
        timestamp: new Date().toISOString(),
        fileName: data.file_name || null,
        fileUrl: data.file_url || null,
      };

      setGeneratedPhotos((prev) => [...prev, newItem]);
    } catch (e) {
      console.error(e);
      alert("Ошибка генерации: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFromCard = (idx) => {
    if (window.confirm("Удалить это фото из карточки?")) {
      const updated = cardPhotos.filter((_, i) => i !== idx);
      onUpdateCardPhotos && onUpdateCardPhotos(updated);
      if (selectedCardIndex >= updated.length) {
        setSelectedCardIndex(Math.max(0, updated.length - 1));
      }
    }
  };

  const handleDeleteGenerated = async (photo) => {
    if (!window.confirm("Удалить из сгенерированных?")) return;

    try {
      if (photo.fileName && api?.photo?.deleteFile) {
        await api.photo.deleteFile(token, photo.fileName);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления файла на сервере");
    }

    setGeneratedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleUploadToCard = (files) => {
    const newItems = Array.from(files).map((f) => ({
      url: URL.createObjectURL(f),
      file: f,
      isNew: true,
    }));
    onUpdateCardPhotos && onUpdateCardPhotos([...cardPhotos, ...newItems]);
  };

  const handleCenterUpload = (files) => {
    const newItems = Array.from(files).map((f) => ({
      url: URL.createObjectURL(f),
      file: f,
      isNew: true,
    }));
    const newList = [...cardPhotos, ...newItems];
    onUpdateCardPhotos && onUpdateCardPhotos(newList);
    setSelectedCardIndex(cardPhotos.length);
  };

  const handleDragFromGenerated = (e, photo) => {
    e.dataTransfer.setData("generatedPhoto", JSON.stringify(photo));
  };

  const handleDropToCard = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("generatedPhoto");
    if (!dataStr) return;
    try {
      const photo = JSON.parse(dataStr);
      onUpdateCardPhotos &&
        onUpdateCardPhotos([
          ...cardPhotos,
          {
            url: photo.fileUrl || photo.url,
            isNew: true,
            fromGenerated: true,
          },
        ]);
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const activeCardUrl = getUrl(cardPhotos[selectedCardIndex]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              🎨 AI Фото Студия
            </h2>
            <p className="text-xs text-violet-600">
              Сцены • Позы • Улучшение • Видео
            </p>
          </div>
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.key
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white text-gray-600 hover:bg-violet-50 border border-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY: 3 COLUMNS */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* LEFT: Card Photos */}
          <div
            className="col-span-3 border-r border-gray-200 pr-3 overflow-y-auto"
            onDrop={handleDropToCard}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                📦 Фото карточки
              </h3>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                {cardPhotos.length}
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs px-3 py-2 mb-3 rounded-lg border-2 border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Загрузить с компьютера
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUploadToCard(e.target.files)}
            />

            {cardPhotos.length ? (
              <div className="grid grid-cols-2 gap-2">
                {cardPhotos.map((item, idx) => {
                  const url = getUrl(item);
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCardIndex(idx)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${
                        idx === selectedCardIndex
                          ? "border-violet-500 ring-4 ring-violet-200 scale-105"
                          : "border-gray-200 hover:border-violet-300"
                      }`}
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {item.isNew && (
                        <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                          NEW
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFromCard(idx);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center mt-8 p-4 border-2 border-dashed border-gray-200 rounded-lg">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>
                  Перетащите сюда
                  <br />
                  фото справа или
                  <br />
                  загрузите новые
                </p>
              </div>
            )}
          </div>

          {/* CENTER: Preview + Controls */}
          <div className="col-span-6 flex flex-col gap-3 overflow-y-auto">
            {/* Preview */}
            <div className="relative flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden min-h-[250px]">
              {activeCardUrl ? (
                <>
                  <img
                    src={activeCardUrl}
                    alt=""
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />

                  <button
                    onClick={() => centerFileInputRef.current?.click()}
                    className="absolute top-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-violet-200 text-xs font-medium text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition-shadow shadow-sm hover:shadow-md"
                  >
                    <Upload className="w-3 h-3" />
                    Сменить фото
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => centerFileInputRef.current?.click()}
                    className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:scale-105"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                      <Plus className="w-8 h-8 text-violet-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      Загрузить фото
                      <br />
                      с компьютера
                    </span>
                  </button>
                </div>
              )}

              <input
                ref={centerFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleCenterUpload(e.target.files)}
              />
            </div>

            {/* Controls */}
            <div className="space-y-3 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm">
              {activeTab === "scene" && (
                <>
                  <select
                    value={selectedCat}
                    onChange={(e) => onChangeCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="">— Категория сцены —</option>
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
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">— Подкатегория —</option>
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
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">— Выберите сцену —</option>
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
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="">— Группа поз —</option>
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
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">— Подгруппа —</option>
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
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">— Выберите позу —</option>
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
                  placeholder={`Введите свой промпт для генерации...
Пример: Добавьте солнечные очки и улыбку`}
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px] resize-y bg-white focus:ring-2 focus:ring-violet-200"
                />
              )}

              {activeTab === "enhance" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    🎯 Уровень улучшения качества
                  </label>
                  <select
                    value={enhanceLevel}
                    onChange={(e) => setEnhanceLevel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="light">Лёгкое улучшение (быстро)</option>
                    <option value="medium">Среднее улучшение (оптимально)</option>
                    <option value="strong">Сильное улучшение (медленно)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Улучшение освещения, резкости, цветов и удаление шума
                  </p>
                </div>
              )}

              {activeTab === "video" && (
                <>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder={`Опишите, какое видео создать из фото...
Пример: Плавное приближение с эффектом параллакса`}
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px] resize-y bg-white focus:ring-2 focus:ring-violet-200"
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      ⏱️ Длительность видео:{" "}
                      <span className="text-violet-600 font-bold">
                        {videoDuration} сек
                      </span>
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={videoDuration}
                      onChange={(e) =>
                        setVideoDuration(Number(e.target.value))
                      }
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>3 сек</span>
                      <span>10 сек</span>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !activeCardUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {activeTab === "video" ? (
                  <Film className="w-5 h-5" />
                ) : activeTab === "enhance" ? (
                  <Zap className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Генерация...
                  </span>
                ) : activeTab === "video" ? (
                  "🎬 Создать видео"
                ) : activeTab === "enhance" ? (
                  "✨ Улучшить фото"
                ) : (
                  "🚀 Сгенерировать"
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Generated */}
          <div className="col-span-3 border-l border-gray-200 pl-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                ✨ Сгенерировано
              </h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {generatedPhotos.length}
              </span>
            </div>

            {generatedPhotos.length ? (
              <div className="grid grid-cols-2 gap-2">
                {generatedPhotos.map((photo) => {
                  const url = photo.fileUrl || photo.url;
                  const timestamp = photo.timestamp
                    ? new Date(photo.timestamp).toLocaleString("ru-RU")
                    : "";

                  return (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={(e) => handleDragFromGenerated(e, photo)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 cursor-move transition-all group hover:scale-105 hover:shadow-lg"
                    >
                      {photo.type === "video" ? (
                        <>
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            controls={false}
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Film className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={url}
                          alt="generated"
                          className="w-full h-full object-cover"
                        />
                      )}

                      <button
                        onClick={() => handleDeleteGenerated(photo)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {timestamp && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition">
                          {timestamp}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center mt-8 p-4 border-2 border-dashed border-gray-200 rounded-lg">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>
                  Здесь появятся
                  <br />
                  сгенерированные
                  <br />
                  фото и видео
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Перетащите фото из правой колонки влево
          </span>
          <span className="flex items-center gap-2">
            <span>💾 Автосохранение</span>
          </span>
        </div>
      </div>
    </div>
  );
}
