import { addAliases } from "module-alias";
import { join } from "path";

const rootPath = join(__dirname, "..");

addAliases({
  "@": join(rootPath, "src"),
});
