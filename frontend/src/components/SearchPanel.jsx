import { Loader2, Play, Search, X, Square } from "lucide-react";

export default function SearchPanel({
  article, setArticle, onStart, processing, error, onClearError, onCancel
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onStart()}
            placeholder="Введите nmID или vendorCode товара..."
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none text-lg"
            disabled={processing}
          />
        </div>

        {!processing ? (
          <button
            onClick={onStart}
            disabled={!article.trim()}
            className={`px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg ${
              !article.trim()
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            }`}
          >
            <Play className="w-5 h-5" />
            Запустить
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="px-6 py-4 rounded-xl font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            Идет обработка
            <Square className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={onClearError} className="text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
