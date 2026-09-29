import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function copyDirRecursive(src, dest) {
  if (!existsSync(src)) return;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const item of readdirSync(src)) {
    const s = join(src, item);
    const d = join(dest, item);
    if (statSync(s).isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

async function main() {
  const rootDir = process.cwd();
  const distDir = join(rootDir, "dist");
  const publicDir = join(distDir, "public");

  // 1. Kopiuj pliki z dist/public do głównego folderu dist/
  if (existsSync(publicDir)) {
    copyDirRecursive(publicDir, distDir);
  }

  // 2. Wygeneruj statyczny index.html uruchamiając na chwilę serwer SSR
  const serverEntry = join(distDir, "server", "index.mjs");
  if (existsSync(serverEntry)) {
    const port = 34567;
    const serverProc = spawn("node", [serverEntry], {
      env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "production" },
      stdio: "pipe",
    });

    try {
      // Poczekaj na uruchomienie serwera
      await new Promise((r) => setTimeout(r, 1200));

      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) {
        const html = await res.text();
        writeFileSync(join(distDir, "index.html"), html, "utf-8");
        if (existsSync(publicDir)) {
          writeFileSync(join(publicDir, "index.html"), html, "utf-8");
        }
        console.log(
          "✔ Wygenerowano index.html dla artefaktów produkcyjnych (rozmiar: " + html.length + " B)",
        );
      }
    } catch (err) {
      console.warn("Ostrzeżenie przy generowaniu index.html:", err.message);
    } finally {
      serverProc.kill();
    }
  }

  // 3. Fallback: jeśli index.html nadal nie istnieje, upewnij się że dist zawiera poprawny plik wejściowy
  const targetHtml = join(distDir, "index.html");
  if (!existsSync(targetHtml)) {
    const fallbackHtml = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Migra — Kontrola jakości</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
    writeFileSync(targetHtml, fallbackHtml, "utf-8");
  }

  console.log("✔ Artefakty produkcyjne w dist/ gotowe.");
}

main().catch((e) => {
  console.error("Błąd postbuild:", e);
  process.exit(1);
});
