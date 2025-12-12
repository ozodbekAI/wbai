// frontend/src/components/PhotoAiEditor.jsx

import { useEffect, useState, useRef } from "react";
import { X, Sparkles, Upload, Trash2, Plus, Film } from "lucide-react";
import { api } from "../api/client";

const TABS = [
  { key: "scene", label: "Сцена" },
  { key: "pose", label: "Поза" },
  { key: "normalize", label: "Нормализация" },
  { key: "custom", label: "Свой промпт" },
  { key: "video", label: "Создать видео" },
];

const VIDEO_PLANS = [
  {
    key: "balance",
    title: "Мне просто нормальное видео",
    credits: 3,
    duration: "≈6 сек",
    resolution: "720P",
  },
  {
    key: "pro_6",
    title: "Аккуратная динамика",
    credits: 6,
    duration: "≈6 сек",
    resolution: "768P",
  },
  {
    key: "pro_10",
    title: "Длинный кадр",
    credits: 8,
    duration: "≈10 сек",
    resolution: "768P",
  },
  {
    key: "super_6",
    title: "Вау-текстуры",
    credits: 10,
    duration: "≈6 сек",
    resolution: "1080P",
  },
];

const GENERATED_PAGE_SIZE = 20; // paginatsiya uchun

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
  mode = "modal", // "modal" | "page"
  showCardColumn = true, // false bo'lsa chapdagi "Фото карточки" yo'q
}) {
  const [activeTab, setActiveTab] = useState("scene");
  const [loading, setLoading] = useState(false);

  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  // ✅ O'RTADAGI AKTIV MEDIA (generate shuni ustida bo'ladi)
  const [activeMedia, setActiveMedia] = useState(null);

  // Generated (o'ng taraf) – backend history + yangi generate’lar
  const [generatedPhotos, setGeneratedPhotos] = useState([]);
  const [genOffset, setGenOffset] = useState(0);
  const [genHasMore, setGenHasMore] = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  const generatedRef = useRef(null);
  const fileInputRef = useRef(null);
  const centerFileInputRef = useRef(null);

  // Custom tab uchun
  const [customPrompt, setCustomPrompt] = useState("");

  // Scene
  const [sceneCategories, setSceneCategories] = useState([]);
  const [sceneSubcats, setSceneSubcats] = useState([]);
  const [sceneItems, setSceneItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");
  const [selectedItem, setSelectedItem] = useState("");

  // Pose
  const [poseGroups, setPoseGroups] = useState([]);
  const [poseSubgroups, setPoseSubgroups] = useState([]);
  const [posePrompts, setPosePrompts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPoseSubgroup, setSelectedPoseSubgroup] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");

  // Video
  const [selectedVideoPlanKey, setSelectedVideoPlanKey] = useState("");
  const [videoScenarios, setVideoScenarios] = useState([]);
  const [selectedVideoScenarioId, setSelectedVideoScenarioId] = useState(null);
  const [useCustomVideoPrompt, setUseCustomVideoPrompt] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [loadingScenarios, setLoadingScenarios] = useState(false);

  // Normalize
  const [normalizeMode, setNormalizeMode] = useState(""); // "own" | "new"
  const [normalizePhotos, setNormalizePhotos] = useState([]); // max 2 photos
  const [modelCategories, setModelCategories] = useState([]);
  const [modelSubcategories, setModelSubcategories] = useState([]);
  const [modelItems, setModelItems] = useState([]);
  const [selectedModelCat, setSelectedModelCat] = useState("");
  const [selectedModelSubcat, setSelectedModelSubcat] = useState("");
  const [selectedModelItem, setSelectedModelItem] = useState("");

  // ✅ cardPhotos o'zgarsa, activeMedia yo'q bo'lsa - birinchisini o'rtaga qo'yamiz
  useEffect(() => {
    if (!activeMedia && cardPhotos?.length) {
      setActiveMedia(cardPhotos[0]);
      setSelectedCardIndex(0);
    }

    if (cardPhotos?.length && selectedCardIndex >= cardPhotos.length) {
      setSelectedCardIndex(0);
      setActiveMedia(cardPhotos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardPhotos]);

  // ✅ Backend’dan generated history ni GET qilish + paginatsiya
  async function loadGenerated(reset = false) {
    if (!token) return;
    if (genLoading) return;
    if (!reset && !genHasMore) return;

    try {
      setGenLoading(true);
      const offset = reset ? 0 : genOffset;

      const data = await api.photo.generated.list(token, {
        offset,
        limit: GENERATED_PAGE_SIZE,
      });

      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];

      const mapped = items.map((item) => ({
        // id sifatida file_name ni ishlatamiz – u unikal
        id: item.file_name || item.id || item.file_url,
        url: item.file_url || item.url,
        type: item.kind === "video" ? "video" : "image",
        timestamp: item.created_at || item.timestamp || null,
        fileName: item.file_name || null,
        fileUrl: item.file_url || item.url || null,
      }));

      setGeneratedPhotos((prev) => (reset ? mapped : [...prev, ...mapped]));
      setGenOffset(offset + mapped.length);
      setGenHasMore(mapped.length === GENERATED_PAGE_SIZE);
    } catch (e) {
      console.error("Error loading generated history:", e);
      setGenHasMore(false);
    } finally {
      setGenLoading(false);
    }
  }

  // Modal ochilganda / token o'zgarganda – history ni qayta yuklash
  useEffect(() => {
    if (!token) return;
    setGenOffset(0);
    setGenHasMore(true);
    loadGenerated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Tabs bo'yicha ma'lumotlarni yuklash
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

    if (activeTab === "video") {
      // Reset video state
      setSelectedVideoPlanKey("");
      setSelectedVideoScenarioId(null);
      setUseCustomVideoPrompt(false);
      setVideoPrompt("");
      setVideoScenarios([]);
    }

    if (activeTab === "normalize") {
      // Reset normalize state
      setNormalizeMode("");
      setNormalizePhotos([]);
      setModelCategories([]);
      setModelSubcategories([]);
      setModelItems([]);
      setSelectedModelCat("");
      setSelectedModelSubcat("");
      setSelectedModelItem("");
    }
  }, [activeTab, token]);

  // Video plan tanlanganda scenariolarni yuklash
  const handleSelectVideoPlan = async (planKey) => {
    setSelectedVideoPlanKey(planKey);
    setSelectedVideoScenarioId(null);
    setUseCustomVideoPrompt(false);
    setVideoPrompt("");
    setVideoScenarios([]);

    try {
      setLoadingScenarios(true);
      const scenarios = await api.video.getScenarios(token);
      setVideoScenarios(scenarios || []);
    } catch (e) {
      console.error("Error loading video scenarios:", e);
      alert("Ошибка загрузки сценариев: " + e.message);
    } finally {
      setLoadingScenarios(false);
    }
  };

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
    setSelectedPoseSubgroup("");
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
    setSelectedPoseSubgroup(subId);
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

  // Normalize functions
  const handleSelectNormalizeMode = async (modeVal) => {
    setNormalizeMode(modeVal);
    setNormalizePhotos([]);
    setSelectedModelCat("");
    setSelectedModelSubcat("");
    setSelectedModelItem("");

    if (modeVal === "new") {
      try {
        const cats = await api.photo.models.listCategories(token);
        setModelCategories(cats || []);
      } catch (e) {
        console.error("Error loading model categories:", e);
      }
    }
  };

  const handleAddNormalizePhoto = (photo) => {
    if (normalizeMode === "own" && normalizePhotos.length >= 2) {
      alert("Максимум 2 фото для режима 'Свой фотомодель'");
      return;
    }
    if (normalizeMode === "new" && normalizePhotos.length >= 1) {
      alert("Для режима 'Новый фотомодель' нужно только 1 фото");
      return;
    }
    setNormalizePhotos((prev) => [...prev, photo]);
  };

  const handleRemoveNormalizePhoto = (idx) => {
    setNormalizePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const onChangeModelCategory = async (catId) => {
    setSelectedModelCat(catId);
    setSelectedModelSubcat("");
    setSelectedModelItem("");
    setModelSubcategories([]);
    setModelItems([]);
    if (!catId) return;
    try {
      const data = await api.photo.models.listSubcategories(token, catId);
      setModelSubcategories(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const onChangeModelSubcategory = async (subId) => {
    setSelectedModelSubcat(subId);
    setSelectedModelItem("");
    setModelItems([]);
    if (!subId) return;
    try {
      const data = await api.photo.models.listItems(token, subId);
      setModelItems(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!token) return;

    // ✅ Generate endi o'rtadagi activeMedia ustida bo'ladi
    const activeItem = activeMedia;
    if (!activeItem) {
      alert("Выберите или загрузите фото по центру");
      return;
    }

    setLoading(true);
    try {
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
      } else if (activeTab === "video") {
        if (!selectedVideoPlanKey) {
          alert("Сначала выберите тариф видео");
          setLoading(false);
          return;
        }

        const plan = VIDEO_PLANS.find((p) => p.key === selectedVideoPlanKey);
        if (!plan) {
          alert("Неверный тариф видео");
          setLoading(false);
          return;
        }

        let promptToSend = "";
        if (useCustomVideoPrompt) {
          if (!videoPrompt.trim()) {
            alert("Введите промпт для видео");
            setLoading(false);
            return;
          }
          promptToSend = videoPrompt.trim();
        } else {
          const scenario = videoScenarios.find(
            (s) => s.id === Number(selectedVideoScenarioId)
          );
          if (!scenario) {
            alert(
              "Выберите сценарий движения камеры или включите режим «Свой промпт»."
            );
            setLoading(false);
            return;
          }
          promptToSend = scenario.prompt;
        }

        data = await api.photo.generateVideo(token, {
          photo_url: imageUrl,
          prompt: promptToSend,
          plan_key: plan.key,
        });
      } else if (activeTab === "normalize") {
        if (!normalizeMode) {
          alert("Выберите режим нормализации");
          setLoading(false);
          return;
        }

        if (normalizeMode === "own") {
          if (normalizePhotos.length < 2) {
            alert("Добавьте 2 фото: изделие и модель");
            setLoading(false);
            return;
          }

          const photo1Url = normalizePhotos[0].file
            ? (await api.photo.uploadPhoto(token, normalizePhotos[0].file))
                .file_url
            : getUrl(normalizePhotos[0]);

          const photo2Url = normalizePhotos[1].file
            ? (await api.photo.uploadPhoto(token, normalizePhotos[1].file))
                .file_url
            : getUrl(normalizePhotos[1]);

          data = await api.photo.generateNormalize(token, {
            mode: "own_model",
            photo_url_1: photo1Url,
            photo_url_2: photo2Url,
          });
        } else if (normalizeMode === "new") {
          if (normalizePhotos.length < 1) {
            alert("Добавьте фото изделия");
            setLoading(false);
            return;
          }

          if (!selectedModelItem) {
            alert("Выберите тип модели");
            setLoading(false);
            return;
          }

          const photoUrl = normalizePhotos[0].file
            ? (await api.photo.uploadPhoto(token, normalizePhotos[0].file))
                .file_url
            : getUrl(normalizePhotos[0]);

          data = await api.photo.generateNormalize(token, {
            mode: "new_model",
            photo_url: photoUrl,
            model_item_id: Number(selectedModelItem),
          });
        }
      }

      const newItem = {
        id: data.file_name || Date.now().toString(),
        url: data.file_url,                            // backend qaytargan url
        type: activeTab === "video" ? "video" : "image",
        timestamp: new Date().toISOString(),
        fileName: data.file_name,
        fileUrl: data.file_url,
      };

      setGeneratedPhotos((prev) => [newItem, ...prev]);

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

      const currentUrl = getUrl(activeMedia);
      const willRemoveUrl = getUrl(cardPhotos[idx]);
      if (currentUrl && willRemoveUrl && currentUrl === willRemoveUrl) {
        const fallback = updated[0] || null;
        setActiveMedia(fallback);
        setSelectedCardIndex(0);
      }
    }
  };

  const handleDeleteGenerated = async (photo) => {
    if (!window.confirm("Удалить из сгенерированных?")) return;

    try {
      if (photo.fileName) {
        // endi bu /api/photo/generated?file_name=... ga to‘g‘ri so‘rov yuboradi
        await api.photo.deleteFile(token, photo.fileName);
        // yoki xohlasang: await api.photo.generated.delete(token, photo.fileName);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления файла на сервере");
    }

    // front tarafdagi listdan ham olib tashlaymiz
    setGeneratedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };


  const handleUploadToCard = (files) => {
    const newItems = Array.from(files).map((f) => ({
      url: URL.createObjectURL(f),
      file: f,
      isNew: true,
    }));
    onUpdateCardPhotos &&
      onUpdateCardPhotos([...cardPhotos, ...newItems]);
  };

  const handleCenterUpload = (files) => {
    const newItems = Array.from(files).map((f) => ({
      url: URL.createObjectURL(f),
      file: f,
      isNew: true,
    }));
    const newList = [...cardPhotos, ...newItems];
    onUpdateCardPhotos && onUpdateCardPhotos(newList);

    const first = newItems[0] || null;
    if (first) {
      setActiveMedia(first);
      setSelectedCardIndex(cardPhotos.length);
    }
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

  const activeCardUrl = getUrl(activeMedia);

  const outerClass =
    mode === "modal"
      ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      : "w-full h-full flex items-center justify-center";

  const innerClass =
    mode === "modal"
      ? "bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col"
      : "bg-white rounded-2xl shadow-2xl w-full h-[80vh] flex flex-col";

  return (
    <div className={outerClass}>
      <div className={innerClass}>
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
            {onClose && (
              <button
                onClick={onClose}
                className="ml-4 p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* LEFT: Card Photos (faqat showCardColumn true bo'lsa) */}
          {showCardColumn && (
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
                        onClick={() => {
                          setSelectedCardIndex(idx);
                          setActiveMedia(item);
                        }}
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
          )}

          {/* CENTER: Preview + Controls */}
          <div
            className={`${
              showCardColumn ? "col-span-6" : "col-span-8"
            } flex flex-col gap-3 overflow-y-auto`}
          >
            {/* Preview */}
            <div className="relative flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden min-h-[250px]">
              {activeCardUrl ? (
                <>
                  {activeMedia?.type === "video" ? (
                    <video
                      src={activeCardUrl}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={activeCardUrl}
                      alt=""
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  )}

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
                      value={selectedPoseSubgroup}
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
                  {selectedPoseSubgroup && posePrompts.length > 0 && (
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

              {activeTab === "normalize" && (
                <div className="space-y-4">
                  {/* РЕЖИМ ВЫБОРА */}
                  {!normalizeMode && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        💎 Выберите режим нормализации
                      </label>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSelectNormalizeMode("own")}
                          className="w-full p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left shadow-sm hover:shadow-md"
                        >
                          <div className="font-semibold text-gray-800 text-sm">
                            👤 Свой фотомодель
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Загрузите 2 фото: изделие + ваша модель
                          </div>
                        </button>

                        <button
                          onClick={() => handleSelectNormalizeMode("new")}
                          className="w-full p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left shadow-sm hover:shadow-md"
                        >
                          <div className="font-semibold text-gray-800 text-sm">
                            ✨ Новый фотомодель
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Загрузите фото изделия, мы добавим модель
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* РЕЖИМ ВЫБРАН */}
                  {normalizeMode && (
                    <>
                      {/* Выбранный режим */}
                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Режим: </span>
                          <span className="font-semibold text-indigo-700">
                            {normalizeMode === "own"
                              ? "Свой фотомодель"
                              : "Новый фотомодель"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setNormalizeMode("");
                            setNormalizePhotos([]);
                            setSelectedModelCat("");
                            setSelectedModelSubcat("");
                            setSelectedModelItem("");
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Изменить
                        </button>
                      </div>

                      {/* Фото для нормализации */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📸 Добавьте фото
                          {normalizeMode === "own" ? " (2 шт)" : " (1 шт)"}
                        </label>

                        {/* Показать уже добавленные фото */}
                        {normalizePhotos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {normalizePhotos.map((photo, idx) => (
                              <div
                                key={idx}
                                className="relative aspect-square rounded-lg overflow-hidden border-2 border-indigo-200"
                              >
                                <img
                                  src={getUrl(photo)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => handleRemoveNormalizePhoto(idx)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 text-center">
                                  Фото {idx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Кнопка добавления фото */}
                        {((normalizeMode === "own" &&
                          normalizePhotos.length < 2) ||
                          (normalizeMode === "new" &&
                            normalizePhotos.length < 1)) && (
                          <button
                            onClick={() => {
                              if (!activeCardUrl) {
                                alert(
                                  "Сначала выберите или загрузите фото (по центру)"
                                );
                                return;
                              }

                              const activeItem =
                                cardPhotos[selectedCardIndex] || {
                                  url: activeCardUrl,
                                };

                              handleAddNormalizePhoto(activeItem);
                            }}
                            className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition flex items-center justify-center gap-2 text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Добавить текущее фото
                          </button>
                        )}
                      </div>

                      {/* Если режим "new" - выбор модели */}
                      {normalizeMode === "new" &&
                        normalizePhotos.length > 0 && (
                          <>
                            <select
                              value={selectedModelCat}
                              onChange={(e) =>
                                onChangeModelCategory(e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-200"
                            >
                              <option value="">— Категория модели —</option>
                              {modelCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>

                            {selectedModelCat &&
                              modelSubcategories.length > 0 && (
                                <select
                                  value={selectedModelSubcat}
                                  onChange={(e) =>
                                    onChangeModelSubcategory(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-200"
                                >
                                  <option value="">— Подкатегория —</option>
                                  {modelSubcategories.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              )}

                            {selectedModelSubcat &&
                              modelItems.length > 0 && (
                                <select
                                  value={selectedModelItem}
                                  onChange={(e) =>
                                    setSelectedModelItem(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-200"
                                >
                                  <option value="">— Тип модели —</option>
                                  {modelItems.map((i) => (
                                    <option key={i.id} value={i.id}>
                                      {i.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                          </>
                        )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "video" && (
                <div className="space-y-4">
                  {!selectedVideoPlanKey && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        🎬 Выберите тариф видео
                      </label>
                      <div className="space-y-2">
                        {VIDEO_PLANS.map((plan) => (
                          <button
                            key={plan.key}
                            onClick={() => handleSelectVideoPlan(plan.key)}
                            className="w-full p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 transition-all text-left shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-800 text-sm">
                                  {plan.title}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {plan.duration} • {plan.resolution}
                                </div>
                              </div>
                              <div className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                                ⭐ {plan.credits}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVideoPlanKey && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Выбран тариф: </span>
                          <span className="font-semibold text-purple-700">
                            {
                              VIDEO_PLANS.find(
                                (p) => p.key === selectedVideoPlanKey
                              )?.title
                            }
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedVideoPlanKey("");
                            setVideoScenarios([]);
                            setSelectedVideoScenarioId(null);
                            setUseCustomVideoPrompt(false);
                            setVideoPrompt("");
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 underline"
                        >
                          Изменить
                        </button>
                      </div>

                      {useCustomVideoPrompt ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ✍️ Свой промпт для видео
                          </label>
                          <textarea
                            value={videoPrompt}
                            onChange={(e) => setVideoPrompt(e.target.value)}
                            placeholder="Опишите движение камеры или эффект... (например: плавное приближение камеры)"
                            className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px] resize-y bg-white focus:ring-2 focus:ring-purple-200"
                          />
                          <button
                            onClick={() => {
                              setUseCustomVideoPrompt(false);
                              setVideoPrompt("");
                            }}
                            className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline"
                          >
                            ← Вернуться к сценариям
                          </button>
                        </div>
                      ) : (
                        <>
                          {loadingScenarios ? (
                            <div className="text-center py-6">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
                              <p className="text-sm text-gray-600 mt-2">
                                Загрузка сценариев...
                              </p>
                            </div>
                          ) : (
                            <>
                              {videoScenarios.length > 0 ? (
                                <div>
                                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                                    🎥 Выберите сценарий движения камеры
                                  </label>
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                    {videoScenarios.map((scenario) => (
                                      <button
                                        key={scenario.id}
                                        onClick={() =>
                                          setSelectedVideoScenarioId(
                                            scenario.id
                                          )
                                        }
                                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                          selectedVideoScenarioId ===
                                          scenario.id
                                            ? "border-purple-500 bg-purple-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50"
                                        }`}
                                      >
                                        <div className="font-medium text-sm text-gray-800">
                                          {scenario.name}
                                        </div>
                                        {scenario.description && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {scenario.description}
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                  <Film className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600">
                                    Сценарии пока не настроены
                                  </p>
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  setUseCustomVideoPrompt(true);
                                  setSelectedVideoScenarioId(null);
                                }}
                                className="w-full mt-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-medium hover:from-purple-200 hover:to-pink-200 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                Написать свой промпт
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={
                  loading ||
                  !activeCardUrl ||
                  (activeTab === "video" && !selectedVideoPlanKey) ||
                  (activeTab === "video" &&
                    !useCustomVideoPrompt &&
                    !selectedVideoScenarioId)
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {activeTab === "video" ? (
                  <Film className="w-5 h-5" />
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
                ) : (
                  "🚀 Сгенерировать"
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Generated */}
          <div
            className={`${
              showCardColumn ? "col-span-3" : "col-span-4"
            } border-l border-gray-200 pl-3 overflow-y-auto`}
            ref={generatedRef}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                ✨ Сгенерировано
              </h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {generatedPhotos.length}
              </span>
            </div>

            {generatedPhotos.length ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {generatedPhotos.map((photo) => {
                    const url = photo.fileUrl || photo.url;
                    const timestamp = photo.timestamp
                      ? new Date(photo.timestamp).toLocaleString("ru-RU")
                      : "";

                    return (
                      <div
                        key={photo.id}
                        draggable={showCardColumn}
                        onDragStart={
                          showCardColumn
                            ? (e) => handleDragFromGenerated(e, photo)
                            : undefined
                        }
                        onClick={() => {
                          setActiveMedia({
                            url,
                            type: photo.type || "image",
                            fileName: photo.fileName || null,
                            fileUrl: photo.fileUrl || null,
                            fromGenerated: true,
                          });
                        }}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 cursor-pointer transition-all group hover:scale-105 hover:shadow-lg"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGenerated(photo);
                          }}
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

                {genHasMore && (
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => loadGenerated(false)}
                      disabled={genLoading}
                      className="text-xs px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {genLoading ? "Загрузка..." : "Показать ещё"}
                    </button>
                  </div>
                )}
              </>
            ) : genLoading ? (
              <div className="text-xs text-gray-400 text-center mt-8 p-4 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-gray-200 border-t-gray-500 mb-2" />
                <p>Загрузка сгенерированных фото...</p>
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
            {showCardColumn
              ? "Перетащите фото из правой колонки влево"
              : "Кликайте по сгенерированным фото справа, чтобы открыть их по центру"}
          </span>
          <span className="flex items-center gap-2">
            <span>💾 Автосохранение</span>
          </span>
        </div>
      </div>
    </div>
  );
}
