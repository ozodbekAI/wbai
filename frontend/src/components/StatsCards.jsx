// src/components/StatsCards.jsx
import { Award, TrendingUp, Settings, Loader2 } from "lucide-react";

export default function StatsCards({ result, processing }) {
  const stats = result?.stats || {};

  const validationScore =
    result?.validation_score ?? (processing ? "..." : 0);

  const iterations =
    result?.iterations_done ?? (processing ? "..." : 0);

  const photosCount = result?.photo_urls?.length ?? 0;

  // 🔹 Umumiy xarakteristikalar
  const totalFields =
    stats.total_fields ??
    result?.new_characteristics?.length ??
    0;
  const totalFilled = stats.total_filled ?? 0;

  // 🔹 Fixed fayldan
  const fixedFieldsCount = stats.fixed_fields ?? 0;
  const fixedFilled = stats.fixed_filled ?? 0;

  // 🔹 AI tomonidan generatsiya qilinadiganlar
  const aiTargetFields = stats.ai_target_fields ?? 0;
  const aiFilled = stats.ai_filled ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Рейтинг карточки */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          {processing ? (
            <Loader2 className="w-8 h-8 animate-spin opacity-80" />
          ) : (
            <Award className="w-8 h-8 opacity-80" />
          )}
          <span className="text-3xl font-bold">
            {validationScore}
          </span>
        </div>
        <p className="text-purple-100 font-medium">
          Рейтинг карточки
        </p>
      </div>

      {/* Итераций */}
      <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">
            {iterations}
          </span>
        </div>
        <p className="text-pink-100 font-medium">Итераций</p>
      </div>

      {/* Характеристики: общие / fixed / AI */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <Settings className="w-8 h-8 opacity-80" />
          <div className="text-right">
            {/* 1) Umumiy to‘ldirish: 39/47 */}
            <div className="text-3xl font-bold leading-none">
              {totalFilled}/{totalFields}
            </div>
            <div className="text-[11px] text-blue-50 mt-1">
              Всего заполнено характеристик
            </div>
          </div>
        </div>

        {/* 2) Fixed va 3) AI bo‘yicha batafsil */}
        <div className="mt-3 text-[11px] space-y-1 text-blue-50">
          <div>
            <span className="font-semibold">Из fixed-файла:</span>{" "}
            {fixedFilled}/{fixedFieldsCount}
          </div>
          <div>
            <span className="font-semibold">Сгенерировано AI:</span>{" "}
            {aiFilled}/{aiTargetFields}
          </div>
        </div>

        <p className="mt-3 text-blue-100 font-medium">Характеристики</p>
      </div>

      {/* Фотографий */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <Award className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">
            {photosCount}
          </span>
        </div>
        <p className="text-green-100 font-medium">Фотографий</p>
      </div>
    </div>
  );
}
