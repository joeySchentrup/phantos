// The published @types package pins an older @types/markdown-it, which clashes
// with the one markdown-it-anchor uses. The plugin's surface is just this.
declare module "markdown-it-footnote" {
  import type { PluginSimple } from "markdown-it";
  const footnote: PluginSimple;
  export default footnote;
}
