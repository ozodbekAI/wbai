import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { X, Code, Edit2, Plus, Trash2, Eye, History } from "lucide-react";
import PromptEditorModal from "./PromptEditorModal";
import Badge from "../ui/Badge";

export default function PromptsPanel({ token, onClose }) {
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [versions, setVersions] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter(p => p.prompt_type.toLowerCase().includes(q));
  }, [prompts, search]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPrompts(token);
      setPrompts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (promptType) => {
    if (!confirm(`Деактивировать промпт ${promptType}?`)) return;
    await api.deletePrompt(token, promptType);
    await load();
  };

  const openPreview = async (promptType) => {
    const data = await api.previewPrompt(token, promptType);
    setPreview(data);
  };

  const openVersions = async (promptType) => {
    const data = await api.versionsPrompt(token, promptType);
    setVersions({ promptType, data });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Админ-панель: Промпты
              </h1>
              <p className="text-sm text-gray-600">Создание и редактирование промптов</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              placeholder="Поиск по типу..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white"
            />
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl font-medium transition-all flex items-center gap-2 border border-green-200"
            >
              <Plus className="w-4 h-4" />
              Новый
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl font-medium transition-all flex items-center gap-2 border border-purple-200"
            >
              <X className="w-4 h-4" />
              Закрыть
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {loading ? (
          <div className="py-20 text-center text-gray-500">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">{p.prompt_type}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="purple">v{p.version}</Badge>
                      <Badge variant={p.is_active ? "green" : "red"}>
                        {p.is_active ? "active" : "inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPreview(p.prompt_type)}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button
                      onClick={() => openVersions(p.prompt_type)}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1"
                    >
                      <History className="w-4 h-4" /> Versions
                    </button>
                    <button
                      onClick={() => setEditing(p)}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => onDelete(p.prompt_type)}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Del
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4 text-sm">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">System Prompt</div>
                    <pre className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-44 overflow-y-auto whitespace-pre-wrap">
                      {p.system_prompt}
                    </pre>
                  </div>
                  {p.strict_rules && (
                    <div>
                      <div className="font-semibold text-gray-700 mb-1">Strict Rules</div>
                      <pre className="bg-red-50 p-3 rounded-xl border border-red-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {p.strict_rules}
                      </pre>
                    </div>
                  )}
                  {p.examples && (
                    <div>
                      <div className="font-semibold text-gray-700 mb-1">Examples</div>
                      <pre className="bg-blue-50 p-3 rounded-xl border border-blue-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {p.examples}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {(editing || creating) && (
        <PromptEditorModal
          token={token}
          initial={editing || null}
          creating={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={load}
        />
      )}

      {preview && (
        <ModalLike onClose={() => setPreview(null)} title={`Preview: ${preview.prompt_type} v${preview.version}`}>
          <pre className="text-xs bg-gray-50 p-4 rounded-xl border border-gray-200 whitespace-pre-wrap">
            {preview.full_prompt}
          </pre>
        </ModalLike>
      )}

      {versions && (
        <ModalLike onClose={() => setVersions(null)} title={`Versions: ${versions.promptType}`}>
          <div className="space-y-2">
            {versions.data.map(v => (
              <div key={v.id} className="p-3 rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <Badge variant="purple">v{v.version}</Badge>
                  <span className="text-sm text-gray-600">{v.created_at}</span>
                </div>
                <div className="text-sm mt-1 text-gray-800">Reason: {v.change_reason}</div>
              </div>
            ))}
          </div>
        </ModalLike>
      )}
    </div>
  );
}

function ModalLike({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
