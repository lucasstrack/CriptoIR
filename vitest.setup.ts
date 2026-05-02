import '@testing-library/jest-dom/vitest';
import { resolveDatabaseUrl } from './tests/integration/helpers/resolve-database-url';

process.env.DATABASE_URL = resolveDatabaseUrl();
