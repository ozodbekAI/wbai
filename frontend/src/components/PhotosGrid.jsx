// src/components/PhotosGrid.jsx
import { useEffect, useState } from "react";
import { Image, Plus, Save } from "lucide-react";

export default function PhotosGrid({
  urls = [],
  onGenerate,   // optional: открыть фотостудию
  onReorder,    // optional: (newUrls: string[]) => void
  onSaveOrder,  // optional
}) {
  const [order, setOrder] = useState(urls);

  useEffect(() => {
    setOrder(urls);
  }, [urls]);

  if (!order.length) return null;

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(fromIndex) || fromIndex === index) return;

    const updated = [...order];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(index, 0, moved);
    setOrder(updated);
    onReorder && onReorder(updated);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSave = () => {
    onSaveOrder && onSaveOrder(order);
  };

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <Image className="w-5 h-5" />
          Фотографии товара ({order.length})
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {order.map((url, idx) => (
            <button
              key={url + idx}
              className="aspect-square cursor-move"
              onClick={() => window.open(url, "_blank")}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <img
                src={url}
                alt={`Фото ${idx + 1}`}
                className="w-full h-full object-cover rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>

        {onSaveOrder && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold shadow-md hover:bg-purple-700 transition-all"
            >
              <Save className="w-4 h-4" />
              Сохранить изменения
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
