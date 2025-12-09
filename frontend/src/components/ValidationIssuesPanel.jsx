// src/components/ValidationIssuesPanel.jsx

import React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export default function ValidationIssuesPanel({ validation }) {
  const issues = validation?.messages || [];
  const hasIssues = issues.length > 0;

  const totalErrors = issues.filter(
    (i) => (i.severity || i.level || "").toLowerCase() === "error"
  ).length;
  const totalWarnings = issues.filter(
    (i) => (i.severity || i.level || "").toLowerCase() === "warning"
  ).length;

  if (!validation) {
    // hech narsa tanlanmagan – panelni umuman ko‘rsatmaymiz
    return null;
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-orange-100 p-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-red-600">
              ! Ошибки
            </span>
            <span className="text-[11px] text-gray-500">
              Валидация текущей карточки WB
            </span>
          </div>
        </div>

        {hasIssues && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
              {totalErrors || issues.length} err
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
              {totalWarnings} warn
            </span>
          </div>
        )}
      </header>

      {!hasIssues ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div className="text-xs text-emerald-800">
            <div className="font-semibold">Ошибок не обнаружено</div>
            <div className="text-[11px]">
              Карточка прошла базовую проверку. Можно запускать генерацию AI.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {issues.map((issue, idx) => {
            const severity = (issue.severity || issue.level || "").toLowerCase();
            const isError = severity === "error";
            const isWarning = severity === "warning";

            const icon = isError ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <Info className="w-4 h-4 text-sky-500" />
            );

            const badgeColor = isError
              ? "bg-red-50 text-red-600 border-red-100"
              : isWarning
              ? "bg-amber-50 text-amber-700 border-amber-100"
              : "bg-sky-50 text-sky-700 border-sky-100";

            const title =
              issue.title ||
              issue.code ||
              issue.field ||
              `Проблема ${idx + 1}`;

            const message =
              issue.message ||
              issue.description ||
              issue.detail ||
              "";

            return (
              <div
                key={`${issue.id || issue.code || "issue"}-${idx}`}
                className="rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2.5 text-xs text-gray-800"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-semibold text-[12px]">
                        {title}
                      </div>
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium " +
                          badgeColor
                        }
                      >
                        {severity || "info"}
                      </span>
                    </div>

                    {message && (
                      <p className="text-[11px] text-gray-700 whitespace-pre-line">
                        {message}
                      </p>
                    )}

                    {/* agar qo‘shimcha data bo‘lsa – field, code va hokazo */}
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-gray-500">
                      {issue.code && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-100">
                          code: {issue.code}
                        </span>
                      )}
                      {issue.field && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-100">
                          поле: {issue.field}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
