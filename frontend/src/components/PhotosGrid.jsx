// src/components/PhotosGrid.jsx
import { Image, Plus, Save, ExternalLink } from "lucide-react";

export default function PhotosGrid({
  photos = [],          // [{ photoId, url, isNew, file? }]
  videoUrl,
  onGenerate,
  onReorder,
  onSaveOrder,
}) {
  if (!photos.length && !videoUrl) return null;

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("index", String(index));
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("index"));
    if (Number.isNaN(fromIndex) || fromIndex === index) return;

    const updated = [...photos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(index, 0, moved);
    onReorder && onReorder(updated);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSave = () => {
    onSaveOrder && onSaveOrder(photos);
  };

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <Image className="w-5 h-5" />
          Медиа товара
          <span className="text-xs opacity-80">
            ({photos.length} фото{videoUrl ? " + видео" : ""})
          </span>
        </h3>

        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Сгенерировать новые фото
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 grid-flow-row-dense">
          {videoUrl && (
            <div className="aspect-square">
              <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-purple-300 shadow-sm bg-black">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
                <div className="absolute left-2 top-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                  Видео товара
                </div>
                <button
                  type="button"
                  className="absolute right-2 bottom-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(videoUrl, "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {photos.map((p, idx) => (
            <button
              key={(p.photoId ?? p.url) + idx}
              className="aspect-square cursor-move"
              onClick={() => window.open(p.url, "_blank")}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <img
                src={p.url}
                alt={`Фото ${idx + 1}`}
                className="w-full h-full object-cover rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>

        {onSaveOrder && !!photos.length && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold shadow-md hover:bg-purple-700 transition-all"
            >
              <Save className="w-4 h-4" />
              Обновить порядок в WB
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
