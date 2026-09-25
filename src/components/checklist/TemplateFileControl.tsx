"use client";

import { useState } from "react";
import { openStorageFile } from "@/hooks/useItemFiles";
import { useRemoveTemplateFile, useTemplateFiles, useUploadTemplateFile } from "@/hooks/useTemplateFiles";

export function TemplateFileControl({ itemKey, locked }: { itemKey: string; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: templateFiles } = useTemplateFiles();
  const uploadFile = useUploadTemplateFile();
  const removeFile = useRemoveTemplateFile();
  const [error, setError] = useState<string | null>(null);

  const record = templateFiles?.[itemKey];

  return (
    <div className="item-template-file">
      <button
        type="button"
        className={`template-toggle-btn${record ? " has-file" : ""}${open ? " active" : ""}`}
        title="Office template document"
        onClick={() => setOpen((v) => !v)}
      >
        {record && <span className="file-toggle-dot" aria-hidden="true" />}
        Office standard
      </button>
      {open && (
        <div className="file-panel">
          <span className="file-panel-title">Office standard</span>
          <button type="button" className="file-panel-close" onClick={() => setOpen(false)}>
            ×
          </button>
          <p className="template-file-note">
            An office-standard form for this item, available to every project. Uploaded once here, downloadable
            everywhere.
          </p>
          <div className="file-panel-row">
            {record ? (
              <>
                <span className="file-attach-name">{record.fileName}</span>
                <button
                  type="button"
                  className="file-mini-btn"
                  onClick={() => openStorageFile("template-files", record.storagePath)}
                >
                  Download
                </button>
                {!locked && (
                  <button
                    type="button"
                    className="file-mini-btn file-remove-btn"
                    onClick={() => removeFile.mutate({ itemKey, storagePath: record.storagePath })}
                  >
                    Remove
                  </button>
                )}
              </>
            ) : locked ? (
              <span className="ov-empty">No template document on file.</span>
            ) : (
              <label className="file-upload-label">
                Upload template (PDF/Word, max 6MB)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setError(null);
                    uploadFile.mutate(
                      { itemKey, file },
                      { onError: (err) => setError(err instanceof Error ? err.message : String(err)) }
                    );
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {error && <div style={{ color: "var(--danger)", fontSize: "10.5px" }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
