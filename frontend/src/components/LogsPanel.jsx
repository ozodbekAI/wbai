import { FileText } from "lucide-react";

export default function LogsPanel({ logs }) {
  if (!logs?.length) return null;
  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Логи процесса
        </h3>
      </div>
      <div className="p-4 max-h-[320px] overflow-y-auto font-mono text-xs space-y-1">
        {logs.map((l, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-gray-400">[{l.time}]</span>
            <span className="text-gray-800">{l.msg}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
