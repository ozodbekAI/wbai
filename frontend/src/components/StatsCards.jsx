import { Award, TrendingUp, Settings, Image, Loader2 } from "lucide-react";

export default function StatsCards({ result, processing }) {
  if (!processing && !result) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          {processing ? <Loader2 className="w-8 h-8 animate-spin opacity-80" /> : <Award className="w-8 h-8 opacity-80" />}
          <span className="text-3xl font-bold">{result?.validation_score ?? "..."}</span>
        </div>
        <p className="text-purple-100 font-medium">Validation Score</p>
      </div>

      <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">{result?.iterations_done ?? "..."}</span>
        </div>
        <p className="text-pink-100 font-medium">Итераций</p>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <Settings className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">{result?.new_characteristics?.length ?? "..."}</span>
        </div>
        <p className="text-blue-100 font-medium">Характеристик</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <Image className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">{result?.photo_urls?.length ?? "..."}</span>
        </div>
        <p className="text-green-100 font-medium">Фотографий</p>
      </div>
    </div>
  );
}
