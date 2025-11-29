import { AppState } from '../types';

// Declare globals for Google APIs
declare var gapi: any;
declare var google: any;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'cashflow_pro_db_v1.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = (onInitComplete: () => void) => {
  if(!CLIENT_ID || !API_KEY) {
    console.warn("Google Drive API Credentials not found. Drive sync disabled.");
    return;
  }

  const gapiLoaded = () => {
    gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
      gapiInited = true;
      if (gisInited) onInitComplete();
    });
  };

  const gisLoaded = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // defined later
    });
    gisInited = true;
    if (gapiInited) onInitComplete();
  };

  // Check if scripts are loaded
  if (typeof gapi !== 'undefined') gapiLoaded();
  if (typeof google !== 'undefined') gisLoaded();
};

export const handleAuthClick = (callback: (token: any) => void) => {
  tokenClient.callback = async (resp: any) => {
    if (resp.error !== undefined) {
      throw (resp);
    }
    callback(resp);
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({prompt: ''});
  }
};

export const findDbFile = async (): Promise<string | null> => {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name = '${FILE_NAME}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch (err) {
    console.error("Error finding file", err);
    throw err;
  }
};

export const loadFromDrive = async (fileId: string): Promise<AppState | null> => {
  try {
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.result as AppState;
  } catch (err) {
    console.error("Error loading file", err);
    throw err;
  }
};

export const saveToDrive = async (data: AppState, existingFileId: string | null): Promise<string> => {
  const fileContent = JSON.stringify(data);
  const file = new Blob([fileContent], {type: 'application/json'});
  
  try {
    if (existingFileId) {
      // Update existing file
      await gapi.client.request({
        path: `/upload/drive/v3/files/${existingFileId}`,
        method: 'PATCH',
        params: {
          uploadType: 'media'
        },
        body: fileContent
      });
      return existingFileId;
    } else {
      // Create new file
      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // Using multipart upload via generic request to handle metadata + content
      const accessToken = gapi.client.getToken().access_token;
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form,
      });
      
      const json = await response.json();
      return json.id;
    }
  } catch (err) {
    console.error("Error saving to Drive", err);
    throw err;
  }
};