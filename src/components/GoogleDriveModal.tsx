import Image from 'next/image';

import type { DriveFile } from '@/lib/useGoogleDrive';

type GoogleDriveModalProps = {
  files: DriveFile[];
  loading: boolean;
  onClose: () => void;
  onLoadFile: (fileId: string, fileName: string) => void;
};

export function GoogleDriveModal({
  files,
  loading,
  onClose,
  onLoadFile,
}: GoogleDriveModalProps) {
  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen z-[10000] custom-modal-overlay"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="relative rounded-[12px] shadow-2xl custom-modal-content flex flex-col"
        style={{
          background: 'var(--tag-bg)',
          border: '2px solid var(--tag-border)',
          boxShadow: '0 12px 48px rgba(40,28,14,0.5)',
          width: '90%',
          maxWidth: '480px',
          maxHeight: '80vh',
          padding: '24px',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-[20px] border-b border-[rgba(0,0,0,0.1)] pb-[12px]">
          <h2 className="text-[18px] font-bold text-[#3a2f1a] font-['Space_Grotesk'] m-0 flex items-center gap-[10px]">
            <Image
              src="/drive-logo.png"
              alt="Drive"
              width={20}
              height={20}
              className="object-contain shrink-0"
            />
            Il tuo Google Drive
          </h2>
          <button
            onClick={onClose}
            className="text-[20px] font-bold text-[#8a7a4a] hover:text-[#b23b2e] cursor-pointer bg-transparent border-none"
            aria-label="Chiudi Google Drive"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#8a7a5a] font-semibold text-[14px]">
              Caricamento in corso...
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8a7a5a] text-[14px] text-center p-4">
              <span className="text-[24px] mb-2">📂</span>
              Non hai ancora salvato nessuna lavagna sul tuo Drive.
            </div>
          ) : (
            <div className="flex flex-col gap-2 pr-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onLoadFile(file.id, file.name)}
                  className="flex flex-col items-start px-[16px] py-[12px] rounded-[8px] border border-[rgba(0,0,0,0.15)] bg-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.9)] hover:border-[rgba(0,0,0,0.3)] hover:shadow-sm transition-all duration-200 cursor-pointer w-full text-left"
                >
                  <span className="font-['Work_Sans'] font-bold text-[14px] text-[#3a2f1a]">
                    {file.name}
                  </span>
                  <span className="font-['Work_Sans'] text-[11px] text-[#8a7a5a] mt-1">
                    Salvato il:{' '}
                    {file.createdTime
                      ? new Date(file.createdTime).toLocaleString('it-IT')
                      : 'Data non disponibile'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
