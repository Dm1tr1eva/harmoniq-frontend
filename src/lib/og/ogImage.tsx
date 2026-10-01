import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const COLOR_LIGHT = "#f7fffb";
const COLOR_ACCENT = "#d1e0d8";
const COLOR_GREEN = "#649179";
const COLOR_DARK = "rgba(7, 7, 33, 0.9)";

const TAGLINE = "Mindful publishing platform for mental health and well-being";
const CHIPS = ["Articles", "Authors", "Community"];

// Satori не підтримує inset — розтягуємо абсолютні шари явними координатами
const FILL = { top: 0, right: 0, bottom: 0, left: 0 };

const publicFile = (path: string) => readFile(join(process.cwd(), "public", path));

// Логотип на сайті — <symbol> у спрайті з fill="currentColor"; Satori не вміє
// <use href>, тому вирізаємо символ і робимо з нього самостійний SVG потрібного кольору
async function getLogoDataUri() {
  const sprite = await publicFile("sprite.svg").then((b) => b.toString("utf8"));
  const symbol = sprite.match(/<symbol[^>]*id="iconlogo"[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/);
  if (!symbol) throw new Error("iconlogo symbol not found in sprite.svg");
  const [, viewBox, paths] = symbol;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${paths.replaceAll("currentColor", COLOR_LIGHT)}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function getLotusDataUri() {
  const jpg = await publicFile("images/about-lotus.jpg");
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

// Satori підтримує лише ttf/otf/woff, а next/font віддає woff2. Google Fonts
// повертає ttf для запиту без браузерного User-Agent; параметр text урізає
// шрифт до потрібних гліфів (зокрема кирилиці в заголовках статей)
async function loadManrope(weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(url).then((r) => r.text());
  const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`Manrope ${weight} not found`);
  return fetch(src).then((r) => r.arrayBuffer());
}

async function loadFonts(text: string) {
  try {
    const [regular, bold] = await Promise.all([loadManrope(500, text), loadManrope(800, text)]);
    return [
      { name: "Manrope", data: regular, weight: 500 as const, style: "normal" as const },
      { name: "Manrope", data: bold, weight: 800 as const, style: "normal" as const },
    ];
  } catch {
    // Без мережі картинка все одно рендериться — вбудованим шрифтом Satori
    return [];
  }
}

function Chip({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "10px 24px",
        borderRadius: 64,
        border: `2px solid ${COLOR_GREEN}`,
        background: "rgba(100, 145, 121, 0.25)",
        color: COLOR_ACCENT,
        fontSize: 24,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

// Фото з лотосом має запечені білі заокруглені кути — масштабуємо трохи
// більше за полотно і зсуваємо, щоб кути опинились за його межами
function LotusBackground({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={1496} height={693} style={{ position: "absolute", left: -60, top: -40 }} />;
}

export async function renderSiteOgImage() {
  const [logo, lotus, fonts] = await Promise.all([
    getLogoDataUri(),
    getLotusDataUri(),
    loadFonts(TAGLINE + CHIPS.join("")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", fontFamily: "Manrope" }}>
        <LotusBackground src={lotus} />
        <div
          style={{
            position: "absolute",
            ...FILL,
            display: "flex",
            background: "linear-gradient(90deg, rgba(7, 7, 33, 0) 35%, rgba(7, 7, 33, 0.8) 75%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 640,
            right: 64,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="Harmoniq" width={440} height={122} />
          <div style={{ display: "flex", marginTop: 28, color: COLOR_LIGHT, fontSize: 34, lineHeight: 1.35 }}>
            {TAGLINE}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
            {CHIPS.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

type ContentOgImageOptions = {
  kicker: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  avatar?: string | null;
};

// Картинка для статті/автора: їхнє фото (або лотос) фоном, поверх — лого,
// заголовок і підпис, щоб у прев'ю було видно і що це, і що це Harmoniq
export async function renderContentOgImage({ kicker, title, subtitle, image, avatar }: ContentOgImageOptions) {
  const [logo, lotus, fonts] = await Promise.all([
    getLogoDataUri(),
    image ? null : getLotusDataUri(),
    loadFonts(kicker + title + (subtitle ?? "")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", fontFamily: "Manrope" }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: "absolute", ...FILL, objectFit: "cover" }}
          />
        ) : (
          <LotusBackground src={lotus!} />
        )}
        <div
          style={{
            position: "absolute",
            ...FILL,
            display: "flex",
            background: `linear-gradient(to top, ${COLOR_DARK} 0%, rgba(7, 7, 33, 0.55) 55%, rgba(7, 7, 33, 0.35) 100%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            ...FILL,
            padding: 64,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="Harmoniq" width={260} height={72} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                width={200}
                height={200}
                style={{ borderRadius: 100, border: `4px solid ${COLOR_ACCENT}`, objectFit: "cover" }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex" }}>
                <Chip>{kicker}</Chip>
              </div>
              <div
                style={{
                  display: "block",
                  marginTop: 20,
                  color: COLOR_LIGHT,
                  fontSize: 64,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  lineClamp: 2,
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ display: "flex", marginTop: 16, color: COLOR_ACCENT, fontSize: 30 }}>{subtitle}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
