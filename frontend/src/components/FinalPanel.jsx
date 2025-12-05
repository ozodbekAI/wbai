// src/components/FinalPanel.jsx
import { CheckCircle, Upload, Download } from "lucide-react";

export default function FinalPanel({
  article,
  result,
  finalData,
  onSubmit,
  onDownload,
}) {
  if (!result || !finalData) return null;

  return (
    <section className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
      <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <CheckCircle className="w-8 h-8" />
        Итоговые данные для отправки
      </h3>

      <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6 space-y-4">
        <div>
          <span className="font-semibold text-purple-100">
            Артикул:
          </span>
          <p className="mt-1 text-white">{article}</p>
        </div>
        <div>
          <span className="font-semibold text-purple-100">
            Название:
          </span>
          <p className="mt-1 text-white">{finalData.title}</p>
        </div>
        <div>
          <span className="font-semibold text-purple-100">
            Характеристик выбрано:
          </span>
          <p className="mt-1 text-white">
            {finalData.characteristics.length}
          </p>
        </div>
        <div>
          <span className="font-semibold text-purple-100">
            Рейтинг карточки:
          </span>
          <p className="mt-1 text-white">
            {result.validation_score}/100
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSubmit}
          className="flex-1 bg-white text-purple-600 py-4 px-6 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Upload className="w-6 h-6" />
          Отправить в WB
        </button>

        <button
          onClick={onDownload}
          className="bg-white/20 hover:bg-white/30 text-white py-4 px-6 rounded-xl font-semibold transition-all flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Скачать JSON
        </button>
      </div>

      <p className="text-center text-purple-200 text-sm mt-4">
        Проверьте все данные перед отправкой.
      </p>
    </section>
  );
}
