// src/components/HistorySidebar.jsx

import React, { useState } from "react";
import {
  History,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export default function HistorySidebar({
  historyItems = [],
  loading = false,
  stats = null,
  onRefresh,
}) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full">
      {/* HEADER – har doim ko‘rinadi, ozgina joy egallaydi */}
      <div className="px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-2 text-xs text-gray-800"
        >
          <History className="w-4 h-4 text-violet-600" />
          <span className="font-semibold">История генераций</span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3 h-3" />
          Обновить
        </button>
      </div>

      {/* BODY – faqat expanded bo‘lganda ko‘rinadi */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Stats */}
          {stats && (
            <div className="px-4 pt-3 pb-2 bg-gray-50/80">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-xl px-3 py-2 border border-gray-100">
                  <div className="text-gray-500">Период</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {stats.period_days ?? 30}
                    <span className="ml-1 text-xs text-gray-500">дн.</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 border border-gray-100">
                  <div className="text-gray-500">Всего обработок</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {stats.total_processed ?? 0}
                  </div>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-gray-500">Успешно</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {stats.completed ?? 0}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <div>
                    <div className="text-gray-500">Ошибки</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {stats.failed ?? 0}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-gray-500 text-[11px]">
                      Успешность
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {Number(stats.success_rate || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[11px]">
                      Средний скоринг
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {Number(stats.avg_validation_score || 0).toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History list – pastki qism, cheklangan balandlik bilan */}
          <div className="px-4 py-3">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !historyItems.length ? (
              <div className="h-20 flex flex-col items-center justify-center text-xs text-gray-400">
                <AlertTriangle className="w-5 h-5 mb-1 text-gray-300" />
                <p className="text-center">
                  История пуста. Запустите обработку карточки.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {historyItems.map((item) => {
                  const status = item.status || "completed";
                  let statusIcon = null;
                  let statusText = "";
                  let statusColor = "";

                  if (status === "completed") {
                    statusIcon = (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    );
                    statusText = "Готово";
                    statusColor = "text-emerald-600";
                  } else if (status === "failed") {
                    statusIcon = <XCircle className="w-3 h-3 text-red-500" />;
                    statusText = "Ошибка";
                    statusColor = "text-red-600";
                  } else if (status === "processing") {
                    statusIcon = (
                      <div className="w-3 h-3 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                    );
                    statusText = "В процессе";
                    statusColor = "text-amber-600";
                  } else {
                    statusText = status;
                    statusColor = "text-gray-500";
                  }

                  return (
                    <div
                      key={item.id}
                      className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[12px] text-gray-900 truncate">
                          {item.article || `nmID: ${item.nm_id || ""}`}
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          {statusIcon}
                          <span className={statusColor}>{statusText}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-500">
                        {item.subject_name || "Без категории"}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-1 text-[11px]">
                        {item.validation_score != null && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Card: {item.validation_score}
                          </span>
                        )}
                        {item.title_score != null && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                            Title: {item.title_score}
                          </span>
                        )}
                        {item.description_score != null && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            Desc: {item.description_score}
                          </span>
                        )}
                        {item.processing_time != null && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">
                            {Number(item.processing_time).toFixed(1)} сек
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-400 mt-1">
                        {item.created_at || ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
