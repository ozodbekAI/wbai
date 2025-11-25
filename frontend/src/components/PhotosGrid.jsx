import { Image } from "lucide-react";

export default function PhotosGrid({ urls = [] }) {
  if (!urls.length) return null;
  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <Image className="w-5 h-5" />
          Фотографии товара ({urls.length})
        </h3>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {urls.map((url, idx) => (
          <button key={idx} className="aspect-square" onClick={() => window.open(url, "_blank")}>
            <img
              src={url}
              alt={`Фото ${idx + 1}`}
              className="w-full h-full object-cover rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
