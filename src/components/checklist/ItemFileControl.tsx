"use client";

import { useState } from "react";
import type { ItemFileEntry } from "@/hooks/useProjectData";
import {
  FILE_ACCEPT,
  openStorageFile,
  useRemoveItemFile,
  useSetItemFileLink,
  useUploadItemFile,
} from "@/hooks/useItemFiles";

export function ItemFileControl({
  itemId,
  projectId,
  itemKey,
  record,
}: {
  itemId: string;
  projectId: string;
  itemKey: string;
  record: ItemFileEntry | undefined;
}) {
  const [open, setOpen] = useState(false);
  const setLink = useSetItemFileLink(projectId, itemId);
  const uploadFile = useUploadItemFile(projectId, itemId, itemKey);
  const removeFile = useRemoveItemFile(projectId, itemId);
  const [linkValue, setLinkValue] = useState(record?.link ?? "");
  const [error, setError] = useState<string | null>(null);

  const hasContent = !!(record?.link || record?.storagePath);

  return (
    <div className="item-file">
      <button
        type="button"
        className={`file-toggle-btn${hasContent ? " has-file" : ""}${open ? " active" : ""}`}
        title="Drawing location / attached document"
        onClick={() => {
          setOpen((v) => !v);
          setLinkValue(record?.link ?? "");
        }}
      >
        🗎
      </button>
      {open && (
        <div className="file-panel">
          <button type="button" className="file-panel-close" onClick={() => setOpen(false)}>
            ×
          </button>
          <div className="file-panel-row">
            <input
              className="file-link-input"
              placeholder="Drawing location (path or URL)"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onBlur={() => {
                if (linkValue !== (record?.link ?? "")) setLink.mutate(linkValue);
              }}
            />
            <button
              type="button"
              className="file-mini-btn"
              disabled={!linkValue}
              onClick={() => navigator.clipboard.writeText(linkValue).catch(() => {})}
            >
              Copy
            </button>
          </div>

          <div className="file-panel-row">
            {record?.storagePath ? (
              <>
                <span className="file-attach-name">{record.fileName}</span>
                <button
                  type="button"
                  className="file-mini-btn"
                  onClick={() => openStorageFile("item-files", record.storagePath!)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="file-mini-btn file-remove-btn"
                  onClick={() => removeFile.mutate(record.storagePath)}
                >
                  Remove
                </button>
              </>
            ) : (
              <label className="file-upload-label">
                Upload document (PDF/Word, max 6MB)
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setError(null);
                    uploadFile.mutate(file, {
                      onError: (err) => setError(err instanceof Error ? err.message : String(err)),
                    });
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
