
import { LogOut, Settings, Package } from "lucide-react";

export default function HeaderBar({ username, onLogout, onOpenPrompts }) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              WB Характеристики
            </h1>
            <p className="text-sm text-gray-600">
              AI генератор и валидатор Wildberries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPrompts}
            className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 rounded-xl font-medium transition-all flex items-center gap-2 border border-purple-200"
          >
            <Settings className="w-4 h-4" />
            Промпты
          </button>
          <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <p className="text-sm font-medium text-purple-700">👤 {username}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-all flex items-center gap-2 border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            Выход
          </button>
        </div>
      </div>
    </header>
  );
}