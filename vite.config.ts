import { defineConfig, type Plugin } from 'vite';
import { parse } from 'yaml';

// Lets the app `import lines from '../content/spin-lines.yaml'`.
// The YAML is parsed at build time, so no YAML parser ships to the browser.
function yamlPlugin(): Plugin {
  return {
    name: 'yaml',
    transform(code, id) {
      if (!id.endsWith('.yaml') && !id.endsWith('.yml')) return null;
      return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
    },
  };
}

export default defineConfig({
  plugins: [yamlPlugin()],
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0]);
