import Badge from "./ui/Badge";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function HistorySidebar({ sessions, activeId, onSelect, onClear }) {
  return (
    <aside className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 h-[calc(100vh-140px)] sticky top-[96px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          История
        </h3>
        {sessions.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200"
          >
            Очистить
          </button>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 max-h-full">
        {sessions.length === 0 && (
          <div className="text-sm text-gray-500 py-6 text-center">
            Пока нет обработанных карточек
          </div>
        )}

        {sessions.map((s) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isActive ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900">nmID: {s.article}</div>
                {s.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {s.status === "error" && <AlertTriangle className="w-4 h-4 text-red-600" />}
              </div>
              <div className="text-xs text-gray-500">{s.time}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={s.status === "done" ? "green" : s.status === "error" ? "red" : "blue"}>
                  {s.status === "done" ? "Готово" : s.status === "error" ? "Ошибка" : "В процессе"}
                </Badge>
                {typeof s.validation_score === "number" && (
                  <Badge variant="purple">Score: {s.validation_score}</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
