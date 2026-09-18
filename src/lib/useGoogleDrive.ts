import { useState } from 'react';

import type { Session } from 'next-auth';
import { getSession, signOut } from 'next-auth/react';

export type DriveFile = {
  id: string;
  name: string;
  createdTime?: string;
};

type BoardExport = {
  state: {
    cards: unknown[];
    groups: unknown[];
  };
  canvas: string | null;
};

type UseGoogleDriveOptions = {
  session: Session | null;
  boardName: string;
  getExportData: () => BoardExport;
  showAlert: (message: string) => Promise<void>;
  showPrompt: (
    message: string,
    defaultValue?: string
  ) => Promise<string | null>;
  onFileLoaded: (fileName: string, data: unknown) => void;
};

export function useGoogleDrive({
  session,
  boardName,
  getExportData,
  showAlert,
  showPrompt,
  onFileLoaded,
}: UseGoogleDriveOptions) {
  const [driveModal, setDriveModal] = useState<{
    show: boolean;
    files: DriveFile[];
    loading: boolean;
  }>({ show: false, files: [], loading: false });

  const getToken = async () => {
    const currentSession = await getSession();
    const token = currentSession?.accessToken ?? session?.accessToken;
    if (!token) {
      await showAlert('Errore di autenticazione. Riprova il login.');
      return null;
    }
    return token;
  };

  const handleUnauthorized = async () => {
    await signOut({ redirect: false });
    await showAlert(
      'La sessione Google è scaduta. Accedi di nuovo per usare Drive.'
    );
  };

  const handleSaveToDrive = async () => {
    const token = await getToken();
    if (!token) return;

    const safeName = boardName.replace(/\s+/g, '-').toLowerCase();
    const fileName = await showPrompt(
      'Salva su Google Drive come:',
      `${safeName}-salvataggio.json`
    );
    if (!fileName?.trim()) return;

    try {
      const finalName = fileName.endsWith('.json')
        ? fileName
        : `${fileName}.json`;
      const form = new FormData();
      form.append(
        'metadata',
        new Blob(
          [JSON.stringify({ name: finalName, mimeType: 'application/json' })],
          { type: 'application/json' }
        )
      );
      form.append(
        'file',
        new Blob([JSON.stringify(getExportData())], {
          type: 'application/json',
        })
      );

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (!response.ok) throw new Error('Upload fallito');

      await showAlert(
        `Il file "${finalName}" è stato salvato con successo nel tuo Google Drive!`
      );
    } catch {
      await showAlert('Errore durante il salvataggio su Drive.');
    }
  };

  const handleOpenDriveModal = async () => {
    const token = await getToken();
    if (!token) return;

    setDriveModal({ show: true, files: [], loading: true });
    try {
      const query = encodeURIComponent(
        'trashed=false and mimeType="application/json"'
      );
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 401) {
        await handleUnauthorized();
        setDriveModal({ show: false, files: [], loading: false });
        return;
      }
      if (!response.ok) throw new Error('Drive request fallita');
      const data = (await response.json()) as { files?: DriveFile[] };
      setDriveModal({ show: true, files: data.files ?? [], loading: false });
    } catch {
      setDriveModal({ show: false, files: [], loading: false });
      await showAlert('Errore nel recupero dei file da Google Drive.');
    }
  };

  const handleLoadDriveFile = async (fileId: string, fileName: string) => {
    const token = await getToken();
    if (!token) return;

    setDriveModal({ show: false, files: [], loading: false });
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (!response.ok) throw new Error('Download fallito');
      onFileLoaded(fileName, await response.json());
    } catch {
      await showAlert('Errore durante il caricamento del file da Drive.');
    }
  };

  return {
    driveModal,
    closeDriveModal: () =>
      setDriveModal({ show: false, files: [], loading: false }),
    handleSaveToDrive,
    handleOpenDriveModal,
    handleLoadDriveFile,
  };
}
