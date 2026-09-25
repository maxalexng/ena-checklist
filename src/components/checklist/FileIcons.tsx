// Small stroke icons for the per-item document toggles — drawn in currentColor so the
// buttons' empty / saved states can recolor them from CSS alone.

export function FolderIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="file-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.75 4.25a1 1 0 0 1 1-1h3.1l1.4 1.5h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function DocDownloadIcon() {
  return (
    <svg className="file-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.75 1.75h5.5l3 3v9.5h-8.5z" fill="none" />
      <path d="M9.25 1.75v3h3" fill="none" />
      <path d="M8 7v4.25M6.25 9.5 8 11.25 9.75 9.5" fill="none" />
    </svg>
  );
}
