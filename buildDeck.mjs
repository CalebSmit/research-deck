// buildDeck.mjs — darker, thicker headers + larger title text (no charts)
import axios from "axios";
import PptxGenJS from "pptxgenjs";

// ---------------- helpers ----------------
function bufToDataUriPng(buf) {
  return "data:image/png;base64," + Buffer.from(buf).toString("base64");
}
async function fetchImageAsDataUri(url) {
  const r = await axios.get(url, { responseType: "arraybuffer" });
  return bufToDataUriPng(r.data);
}

// ---------------- theme ----------------
const BRAND_LIGHT = "1F6FEB";   // thin bar on title slide
const BRAND_DARK  = "0A3A8B";   // **darker** header on content slides
const TEXT  = "111111";
const SUBT  = "666666";

const TITLE = { fontFace: "Calibri", fontSize: 35, bold: true, color: TEXT };
const H2    = { fontFace: "Calibri", fontSize: 20, bold: true, color: TEXT };
const BODY  = { fontFace: "Calibri", fontSize: 16, color: TEXT };
const SMALL = { fontFace: "Calibri", fontSize: 14, color: SUBT };

// slide geometry
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const MARGIN  = 0.6;

// content header height & title style (bigger font)
const HEADER_H = 1.1; // **thicker**
const HEADER_TITLE = {
  fontFace: "Calibri",
  fontSize: 30,       // **larger**
  bold: true,
  color: "FFFFFF"     // white text in dark bar
};

// Y for header titles (centered in the band)
const HEADER_TITLE_Y = (HEADER_H - 0.6) / 2; // 0.6" box for the text
const CONTENT_TOP = 0.8 + HEADER_H; // content starts under the bar

// Helper to place the content slide title inside the dark bar
function addContentTitle(slide, text) {
  slide.addText(text, {
    x: MARGIN,
    y: HEADER_TITLE_Y,
    w: SLIDE_W - 2 * MARGIN,
    h: 0.6,
    ...HEADER_TITLE
  });
}

// ---------------- deck ----------------
export async function buildPptxBuffer(data) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  // Title master (thin light-blue bar)
  pptx.defineSlideMaster({
    title: "TITLE_MASTER",
    bkgd: "FFFFFF",
    objects: [],
    slideNumber: { x: SLIDE_W-1.1, y: SLIDE_H-0.6, color: SUBT, fontSize: 12 }
  });

  // Content master (dark, **thicker** header bar)
  pptx.defineSlideMaster({
    title: "CONTENT_MASTER",
    bkgd: "FFFFFF",
    objects: [
      { rect: { x:0, y:0, w:"100%", h: HEADER_H, fill: BRAND_DARK } }
    ],
    slideNumber: { x: SLIDE_W-1.1, y: SLIDE_H-0.6, color: SUBT, fontSize: 12 }
  });

// ------------- Slide 1: Cover -------------
{
  const s = pptx.addSlide({ masterName: "TITLE_MASTER" }); // <- make sure it's TITLE_MASTER

  // Big centered title
  s.addText(`${data.companyName} (${data.ticker})`, {
    x: MARGIN,
    y: (SLIDE_H / 2) - 1.2,    // move up/down to taste
    w: SLIDE_W - 2 * MARGIN,
    h: 1.8,
    fontFace: "Calibri",
    fontSize: 60,              // make bigger/smaller here
    bold: true,
    color: TEXT,
    align: "center"
  });

  // Centered subtitle (optional)
  s.addText(`As of ${data.asOfDate}`, {
    x: MARGIN,
    y: (SLIDE_H / 2) + 0.8,    // spacing below title
    w: SLIDE_W - 2 * MARGIN,
    h: 0.6,
    fontFace: "Calibri",
    fontSize: 22,
    color: SUBT,
    align: "center"
  });

  // Optional logo (keep this inside the same block)
  if (data.logoUrl) {
    try {
      const dataUri = await fetchImageAsDataUri(data.logoUrl);
      s.addImage({ data: dataUri, x: SLIDE_W - 2.3, y: 0.6, w: 1.5, h: 1.5 });
    } catch {}
  }
}

  // ------------- Slide 2: Company Snapshot -------------
  {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Company Snapshot");

    const bullets = [
      `• Industry: ${data.snapshot.industry}`,
      `• Business model: ${data.snapshot.businessModel}`,
      data.snapshot.marketCap ? `• Market cap: ${data.snapshot.marketCap}` : null,
      `• Growth focus: ${data.snapshot.growthFocus}`
    ].filter(Boolean).join("\n");

    s.addText(bullets, { x:MARGIN, y:CONTENT_TOP, w:SLIDE_W-2*MARGIN, h:4.2, ...BODY, lineSpacing:20 });
  }

  // ------------- Slide 3: Analyst Ratings & Targets (table only for now) -------------
  {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Analyst Ratings & Targets");

    const rows = [["Source","Rating","Target","Upside/Downside"]];
    (data.ratings || []).forEach(r => {
      const up = data.priceToday != null ? (((r.target - data.priceToday) / data.priceToday) * 100).toFixed(1) + "%" : "—";
      rows.push([r.source, r.rating, `$${r.target}`, up]);
    });

    const tableW = SLIDE_W - 2 * MARGIN;
    s.addTable(rows, {
      x: MARGIN, y: CONTENT_TOP, w: tableW, fontSize: 14,
      colW: [tableW*0.47, tableW*0.18, tableW*0.15, tableW*0.20],
      tableHeaderRow: true, fillHdr: "F3F4F6", colorHdr: TEXT,
      border: { type:"solid", color:"D1D5DB", pt:1 },
      rowH: 0.45
    });
  }

  // ------------- Slide 4: Key Takeaways -------------
  {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Key Takeaways");

    s.addText("Positives", { x:MARGIN, y:CONTENT_TOP, w:5.6, h:0.5, fontFace:"Calibri", fontSize:18, bold:true, color:"157347" });
    s.addText((data.positives || []).map(p=>"• "+p).join("\n"),
      { x:MARGIN, y:CONTENT_TOP+0.5, w:5.6, h:4.0, ...BODY, lineSpacing:20 });

    s.addText("Negatives", { x:MARGIN+5.8, y:CONTENT_TOP, w:5.6, h:0.5, fontFace:"Calibri", fontSize:18, bold:true, color:"B02A37" });
    s.addText((data.negatives || []).map(p=>"• "+p).join("\n"),
      { x:MARGIN+5.8, y:CONTENT_TOP+0.5, w:5.6, h:4.0, ...BODY, lineSpacing:20 });
  }

  // ------------- Slide 5: Peer Comparison -------------
  if (data.competitors?.length) {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Peer Comparison");

    const header = ["Peer","Mkt Cap ($B)","P/E","Note"];
    const body = data.competitors.map(c => [
      c.peer, c.mktCap ? (c.mktCap/1e3).toFixed(1) : "—", c.pe ?? "—", c.note ?? ""
    ]);

    const tableW = SLIDE_W - 2 * MARGIN;
    s.addTable([header, ...body], {
      x: MARGIN, y: CONTENT_TOP, w: tableW, fontSize: 14,
      colW: [tableW*0.40, tableW*0.23, tableW*0.15, tableW*0.22],
      tableHeaderRow: true, fillHdr: "F3F4F6", colorHdr: TEXT,
      border: { type:"solid", color:"D1D5DB", pt:1 },
      rowH: 0.45
    });
  }

  // ------------- Slide 6: Risks & What to Watch -------------
  {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Risks & What to Watch");

    const risks = (data.risks?.length ? data.risks : ["(none provided)"]).map(r => "• " + r).join("\n");
    const watch = (data.watch?.length ? data.watch : ["(none provided)"]).map(w => "• " + w).join("\n");

    s.addText("Risks", { x:MARGIN, y:CONTENT_TOP, w:5.6, h:0.5, ...H2 });
    s.addText(risks,  { x:MARGIN, y:CONTENT_TOP+0.5, w:5.6, h:4.0, ...BODY, lineSpacing:20 });

    s.addText("What to Watch", { x:MARGIN+5.8, y:CONTENT_TOP, w:5.6, h:0.5, ...H2 });
    s.addText(watch,            { x:MARGIN+5.8, y:CONTENT_TOP+0.5, w:5.6, h:4.0, ...BODY, lineSpacing:20 });
  }

  // ------------- Slide 7: Strategic Commentary -------------
  {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Strategic Commentary");

    s.addText("Overall Tone:", { x:MARGIN, y:CONTENT_TOP, w:3.2, h:0.5, ...H2 });
    s.addText(` ${data.tone}`, { x:MARGIN+2.5, y:CONTENT_TOP, w:8.8, h:0.5, ...H2, color: BRAND_LIGHT, underline:true });
    s.addText(data.whyTone, { x:MARGIN, y:CONTENT_TOP+0.7, w:SLIDE_W-2*MARGIN, h:4.0, ...BODY, lineSpacing:20 });
  }

  // ------------- Slide 8: Sources -------------
  if (data.sources?.length) {
    const s = pptx.addSlide({ masterName: "CONTENT_MASTER" });
    addContentTitle(s, "Sources");
    s.addText(data.sources.map(x=>"• "+x).join("\n"),
      { x:MARGIN, y:CONTENT_TOP, w:SLIDE_W-2*MARGIN, h:4.6, ...SMALL, lineSpacing:18, color:TEXT });
  }

  const buf = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(buf);
}


