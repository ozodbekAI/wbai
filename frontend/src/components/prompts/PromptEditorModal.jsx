import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { X, Save } from "lucide-react";

export default function PromptEditorModal({ token, initial, creating, onClose, onSaved }) {
  const [prompt_type, setPromptType] = useState(initial?.prompt_type || "");
  const [system_prompt, setSystemPrompt] = useState(initial?.system_prompt || "");
  const [strict_rules, setStrictRules] = useState(initial?.strict_rules || "");
  const [examples, setExamples] = useState(initial?.examples || "");
  const [change_reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setPromptType(initial.prompt_type);
      setSystemPrompt(initial.system_prompt);
      setStrictRules(initial.strict_rules || "");
      setExamples(initial.examples || "");
    }
  }, [initial]);

  const save = async () => {
    setSaving(true);
    try {
      if (creating) {
        await api.createPrompt(token, { prompt_type, system_prompt, strict_rules, examples });
      } else {
        await api.updatePrompt(token, prompt_type, { system_prompt, strict_rules, examples, change_reason });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = prompt_type && system_prompt && (creating || change_reason);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">
            {creating ? "Создать промпт" : `Редактирование: ${prompt_type}`}
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Тип промпта *</label>
            <input
              value={prompt_type}
              onChange={(e)=>setPromptType(e.target.value)}
              disabled={!creating}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
              placeholder="title / description / chars / color_detector ..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">System Prompt *</label>
            <textarea
              value={system_prompt}
              onChange={(e)=>setSystemPrompt(e.target.value)}
              className="w-full h-56 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none font-mono text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Strict Rules</label>
            <textarea
              value={strict_rules}
              onChange={(e)=>setStrictRules(e.target.value)}
              className="w-full h-28 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none font-mono text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Examples</label>
            <textarea
              value={examples}
              onChange={(e)=>setExamples(e.target.value)}
              className="w-full h-28 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none font-mono text-sm resize-none"
            />
          </div>

          {!creating && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Причина изменения *</label>
              <input
                value={change_reason}
                onChange={(e)=>setReason(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                placeholder="Например: Улучшение точности генерации"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium">
            Отмена
          </button>
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
