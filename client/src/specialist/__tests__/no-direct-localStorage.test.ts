import fs from "fs";
import path from "path";

const SPECIALIST_DIR = path.resolve(__dirname, "..");
const ALLOWED_LOCALSTORAGE_FILES = [path.resolve(SPECIALIST_DIR, "storage", "HybridDraftStore.ts")];
const LOCALSTORAGE_ACCESS_TOKEN = `localStorage${"."}`;

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("specialist localStorage discipline", () => {
  test("only the storage adapter may directly call localStorage", () => {
    const sourceFiles = collectSourceFiles(SPECIALIST_DIR);
    const offenders = sourceFiles.filter((filePath) => {
      if (ALLOWED_LOCALSTORAGE_FILES.includes(filePath)) {
        return false;
      }

      const content = fs.readFileSync(filePath, "utf8");
      return content.includes(LOCALSTORAGE_ACCESS_TOKEN);
    });

    const readableOffenders = offenders.map((filePath) => path.relative(SPECIALIST_DIR, filePath));

    if (readableOffenders.length > 0) {
      throw new Error(
        [
          "Direct localStorage calls are only allowed in HybridDraftStore.ts.",
          "Move these usages behind the storage adapter:",
          ...readableOffenders.map((filePath) => `- ${filePath}`),
        ].join("\n")
      );
    }
  });
});
