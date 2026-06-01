import type { Manifest } from './manifest-validator';

export const APP_VERSION = '0.1.0';

export const EMPTY_MANIFEST: Manifest = {
  name: '',
  version: '1.0.0',
  description: '',
  serverUrl: '',
  authType: 'none',
  domain: 'devtools',
  tools: [
    {
      name: '',
      description: '',
      endpoint: '/',
      method: 'POST',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
};
