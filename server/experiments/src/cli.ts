// CLI entrypoint for running an experiment.
//
// Usage:
//   ts-node -r tsconfig-paths/register experiments/src/cli.ts \
//     --variant baseline --story <storyId> --pages 1,4,7 --out exp-00-baseline

import "./bootstrap";
import { runExperiment } from "./runner";
import { VARIANTS } from "./variants";

interface Args {
  variant: string;
  story: string;
  pages: string;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag?.startsWith("--")) continue;
    const key = flag.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    (out as Record<string, string>)[key] = value;
    i++;
  }
  for (const k of ["variant", "story", "pages", "out"] as const) {
    if (!out[k]) {
      throw new Error(`Missing required flag: --${k}`);
    }
  }
  return out as Args;
}

function printUsage(): void {
  console.log(
    `\nImage-gen experiment runner\n\n` +
      `Usage:\n` +
      `  npm run -w server experiment:run -- --variant <id> --story <storyId> --pages 1,4,7 --out exp-00-baseline\n\n` +
      `Available variants: ${Object.keys(VARIANTS).join(", ")}\n`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : err}`);
    printUsage();
    process.exit(2);
  }

  const pageNumbers = args.pages
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`Invalid page number: ${s}`);
      }
      return n;
    });

  if (pageNumbers.length === 0) {
    throw new Error("--pages requires at least one page number");
  }

  await runExperiment({
    variantId: args.variant,
    storyId: args.story,
    pageNumbers,
    outName: args.out,
  });
}

main().catch((err) => {
  console.error("\n[cli] fatal:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
