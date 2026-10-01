import PocketBase, { LocalAuthStore } from 'pocketbase';

// In production the SPA is served by the same PocketBase that answers the API,
// so the default is the page's own origin. Local dev points Vite at :8090.
export const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL ?? '/';

// Scope the auth store per backend URL so a token cached against one
// PocketBase instance (e.g. production) isn't replayed against another
// (e.g. localhost), which would fail rule eval with "sql: no rows in result set".
const authStore = new LocalAuthStore(`pocketbase_auth_${POCKETBASE_URL}`);

const pb = new PocketBase(POCKETBASE_URL, authStore);

export default pb;
