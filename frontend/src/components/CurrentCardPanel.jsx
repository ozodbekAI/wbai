import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Film,
  Tag,
  Ruler,
  Scale,
  PackageOpen,
  ImageIcon,
  ListChecks,
  BadgeAlert,
} from "lucide-react";
import PhotosGrid from "./PhotosGrid";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function CurrentCardPanel({
  card,
  validation,
  editableTitle,
  onChangeTitle,
  editableDescription,
  onChangeDescription,
  onGenerate,
  processingGenerate,
}) {
  if (!card) return null;

  const messages = validation?.messages || [];
  const errors = messages.filter((m) => m.level === "error");
  const warnings = messages.filter((m) => m.level === "warning");

  const photoCount = card.photos?.length || 0;
  const characteristicsCount = card.characteristics?.length || 0;
  const sizesCount = card.sizes?.length || 0;

  return (
    <section className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-6">
      {/* 0. Validation messages – HAR DOIM BOSHIDA */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800 text-sm">
                  Проблемы валидации текущей карточки
                </h3>
                <p className="text-xs text-red-700/80">
                  Исправьте ошибки и предупреждения, затем запустите AI генерацию.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="px-2 py-1 rounded-full bg-white text-red-700 border border-red-200">
                Ошибки: {errors.length}
              </span>
              <span className="px-2 py-1 rounded-full bg-white text-amber-700 border border-amber-200">
                Предупреждения: {warnings.length}
              </span>
            </div>
          </div>

          {/* Xabarlar ro'yxati – scroll YO'Q */}
          <div className="space-y-2 text-sm">
            {messages.map((m, idx) => {
              const isError = m.level === "error";
              const Icon = isError ? AlertTriangle : CheckCircle2;
              const colorClasses = isError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800";

              return (
                <div
                  key={idx}
                  className={`border rounded-xl px-3 py-2 flex items-start gap-2 ${colorClasses}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-xs sm:text-sm">
                      {m.field}
                      {m.code ? ` · ${m.code}` : ""}
                    </div>
                    <div className="text-xs mt-0.5">{m.message}</div>

                    {m.details?.invalid_values?.length > 0 && (
                      <div className="mt-1 text-xs">
                        Неверные значения:{" "}
                        <span className="font-medium">
                          {m.details.invalid_values.join(", ")}
                        </span>
                      </div>
                    )}

                    {m.details?.suggestions &&
                      Object.entries(m.details.suggestions).map(
                        ([bad, sugg], i2) =>
                          sugg?.length > 0 && (
                            <div key={i2} className="mt-1 text-xs">
                              Для «{bad}» WB рекомендует:{" "}
                              <span className="font-medium">
                                {sugg.join(", ")}
                              </span>
                            </div>
                          )
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Header + generate */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PackageOpen className="w-6 h-6 text-purple-500" />
              Текущая карточка WB
            </h2>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              nmID: {card.nmID}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {card.subjectName}
            </span>
            {card.vendorCode && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Артикул: {card.vendorCode}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {card.brand && (
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-800">{card.brand}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Ruler className="w-4 h-4 text-gray-400" />
              <span>
                Ш×В×Д: {card.dimensions?.width ?? "-"}×
                {card.dimensions?.height ?? "-"}×
                {card.dimensions?.length ?? "-"} см
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Scale className="w-4 h-4 text-gray-400" />
              <span>Вес: {card.dimensions?.weightBrutto ?? 0} кг</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Создано: {formatDate(card.createdAt)}</span>
            <span>·</span>
            <span>Обновлено: {formatDate(card.updatedAt)}</span>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={processingGenerate}
          className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg transition-all ${
            processingGenerate
              ? "bg-amber-50 text-amber-700 border border-amber-200 cursor-wait"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
          }`}
        >
          <Film className="w-5 h-5" />
          {processingGenerate ? "Генерация нового варианта..." : "Сгенерировать новый вариант (AI)"}
        </button>
      </div>

      {/* 2. Stats row – scroll yo‘q, oddiy grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <ImageIcon className="w-6 h-6 opacity-80" />
            <span className="text-2xl font-bold">{photoCount}</span>
          </div>
          <p className="text-indigo-100 text-sm">Фотографий</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <ListChecks className="w-6 h-6 opacity-80" />
            <span className="text-2xl font-bold">{characteristicsCount}</span>
          </div>
          <p className="text-pink-100 text-sm">Характеристик</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <PackageOpen className="w-6 h-6 opacity-80" />
            <span className="text-2xl font-bold">{sizesCount}</span>
          </div>
          <p className="text-emerald-100 text-sm">Размеров</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <BadgeAlert className="w-6 h-6 opacity-80" />
            <span className="text-lg font-bold">
              {errors.length} err / {warnings.length} warn
            </span>
          </div>
          <p className="text-yellow-100 text-sm">Проблемы валидации</p>
        </div>
      </div>

      {/* 3. Title + Description + meta */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1.2fr] gap-6">
        {/* Left: editable title & description */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Текущее название (Title)
            </label>
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => onChangeTitle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none transition-all"
            />
            <div className="mt-1 text-xs text-gray-500">
              Длина: {editableTitle?.length || 0} символов
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Текущее описание
            </label>
            <textarea
              value={editableDescription}
              onChange={(e) => onChangeDescription(e.target.value)}
              className="w-full min-h-[160px] px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none transition-all resize-y"
            />
            <div className="mt-1 text-xs text-gray-500">
              Длина: {editableDescription?.length || 0} символов
            </div>
          </div>
        </div>

        {/* Right: meta info */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-800 text-sm">
              Основная информация о карточке
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <div>
              <div className="text-gray-500 text-xs uppercase">Бренд</div>
              <div className="font-medium">{card.brand || "-"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase">VendorCode</div>
              <div className="font-medium">{card.vendorCode || "-"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase">subjectID</div>
              <div className="font-medium">{card.subjectID}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase">nmUUID</div>
              <div className="font-mono text-[10px] break-all text-gray-600">
                {card.nmUUID}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase">Нужен КИЗ</div>
              <div className="font-medium">{card.needKiz ? "Да" : "Нет"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase">Ростовка</div>
              <div className="font-medium">
                {card.characteristics?.find((c) => c.name === "Тип ростовки")
                  ?.value?.join(", ") || "-"}
              </div>
            </div>
          </div>

          {card.tags?.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs uppercase mb-1">Теги</div>
              <div className="flex flex-wrap gap-2">
                {card.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs px-2 py-1 rounded-full border bg-white flex items-center gap-1"
                    style={{ borderColor: `#${t.color}` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `#${t.color}` }}
                    />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Photos */}
      {photoCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-800 text-sm">
              Фотографии товара
            </h3>
          </div>
          <PhotosGrid
            urls={card.photos
              .map((p) => p.big || p.hq || p.square)
              .filter(Boolean)}
          />
        </div>
      )}

      {/* 5. Characteristics + Sizes – scroll YO‘Q, to‘liq ochiq */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Characteristics */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-800 text-sm">
              Характеристики ({characteristicsCount})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {card.characteristics?.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-white px-3 py-2 border border-gray-200"
              >
                <div className="font-medium text-gray-800 text-xs sm:text-sm">
                  {c.name}
                </div>
                <div className="text-[11px] text-gray-400">id: {c.id}</div>
                <div className="text-xs mt-1 text-gray-700">
                  {Array.isArray(c.value)
                    ? c.value.join(", ")
                    : String(c.value)}
                </div>
              </div>
            ))}
            {!card.characteristics?.length && (
              <div className="text-xs text-gray-400">Нет характеристик</div>
            )}
          </div>
        </div>

        {/* Sizes */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-800 text-sm">
              Размеры ({sizesCount})
            </h3>
          </div>

          <table className="w-full text-xs text-gray-700 border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-1 pr-2">chrtID</th>
                <th className="py-1 pr-2">techSize</th>
                <th className="py-1 pr-2">wbSize</th>
                <th className="py-1 pr-2">SKUs</th>
              </tr>
            </thead>
            <tbody>
              {card.sizes?.map((s) => (
                <tr key={s.chrtID} className="border-b border-gray-100">
                  <td className="py-1 pr-2 font-mono">{s.chrtID}</td>
                  <td className="py-1 pr-2">{s.techSize}</td>
                  <td className="py-1 pr-2">{s.wbSize}</td>
                  <td className="py-1 pr-2">
                    <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                      {s.skus?.length || 0}
                    </span>
                  </td>
                </tr>
              ))}
              {!card.sizes?.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-2 text-center text-gray-400 text-xs"
                  >
                    Нет данных по размерам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
