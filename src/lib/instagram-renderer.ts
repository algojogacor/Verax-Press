/**
 * Instagram Carousel Multi-Slide Rendering Engine for Verax Press
 *
 * Produces crisp, publication-grade 1080x1080 PNG slides matching
 * the Verax Press editorial design identity:
 * - Cream paper background: #FBF8F3
 * - Deep dark ink text: #161310
 * - Soft secondary ink: #4A453E
 * - Crimson brand accent: #8B1E1E
 * - Border / rule hairline: #E5DFD5
 * - Embedded Newsreader serif & Inter sans fonts for zero-runtime serverless dependency.
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { getSatoriFonts } from "@/lib/instagram-fonts";

export type SlideType = "cover" | "content" | "quote" | "closing";

export interface SlideData {
  slideType?: SlideType;
  kicker?: string;
  title?: string;
  content?: string;
  sourceNotes?: string;
  keyTakeaways?: string[];
  callToAction?: string;
  quoteAuthor?: string;
  quoteAuthorTitle?: string;
}

export interface ArticleForInstagram {
  id: string;
  title: string;
  deck?: string | null;
  slug?: string;
  desk?: { name: string; slug?: string } | string | null;
  byline?: string | null;
  publishedAt?: Date | string | null;
  heroMedia?: { url?: string; caption?: string } | null;
  contentJson?: string | null;
}

// Brand SVG vector paths
const VERAX_MARK_PATH =
  "M405.39 229.05L534.49 229.04L534.5 242.04C534.5 242.04 533.85 242.11 533.85 242.11C523.84 243.16 508.81 245.41 504.31 256.11C500.06 266.2 504.78 277.64 508.25 287.16C510.4 293.07 512.78 298.9 514.98 304.79C520.02 318.25 525.33 331.58 530.4 345.02C536.38 360.84 542.57 376.57 548.47 392.42C552.55 403.37 556.91 414.22 561.07 425.14C565.24 436.09 569.33 447.07 573.6 457.99C576.78 466.14 579.84 474.31 582.95 482.49C587.67 494.9 592.64 507.21 597.29 519.65C602.22 532.8 607.61 545.79 612.48 558.96L687.41 329.14C694.78 329.44 701.37 329.94 708.84 331.34C711.52 331.85 714.2 332.33 716.83 333C715.82 336.39 714.64 339.72 713.54 343.08C709.5 355.5 705.28 367.87 701.27 380.3C697.81 391.01 694.15 401.67 690.82 412.43C688.74 419.17 686.37 425.81 684.2 432.53C677.05 454.69 669.67 476.77 662.5 498.92C660.61 504.74 658.81 510.62 656.8 516.39C652.54 528.56 648.69 540.89 644.73 553.16C642.5 560.08 640.1 566.94 637.86 573.86C636.03 579.49 634.05 585.08 632.26 590.72C631.68 592.54 631.45 594.19 631.42 596.1C631.24 606.33 631.35 619.87 633.65 629.93C637.68 647.52 651.14 652.06 667.62 653.28L667.64 666.95L543.48 666.94L543.53 653.27C544.83 653.21 546.13 653.13 547.42 653C572.96 650.5 578.51 637.38 579.71 613.59C580.01 607.56 580.75 605.5 578.58 599.91C575.88 592.95 573 586.04 570.26 579.09C551.47 531.42 532.64 483.76 513.8 436.1C506.36 417.27 498.99 398.41 491.47 379.61C487.83 370.51 484.34 361.36 480.72 352.26C473.93 335.23 467.29 318.14 460.56 301.09C457.74 293.96 455.05 286.76 452.14 279.67C448.47 270.71 444.58 263.11 438.28 255.72C430.69 246.85 419.99 243.48 408.72 242.28C407.59 242.16 406.46 242.06 405.32 241.96L405.39 229.05Z M522.08 292.62C523.03 292.61 523.99 292.61 524.94 292.61C569.55 292.62 614.16 292.61 658.76 292.62C672.12 292.62 685.49 292.46 698.85 292.63C706.56 292.74 714.27 293.35 721.93 294.31C740.78 296.66 758.52 301.05 775.57 309.25C775.58 309.25 776.64 309.77 776.65 309.77C792.67 317.61 808.13 330.42 817.34 345.87C826.38 361.01 830.06 378.26 830 395.78C829.87 431.95 814.83 460.36 783.22 478.52C758.91 492.49 728.14 497.45 700.52 497.7C692.03 497.78 683.26 497.63 674.8 496.85L683.41 470.75C686.1 470.83 688.79 470.91 691.47 470.95C712.66 471.28 733.68 466.92 750.79 453.89C770.9 438.57 778.66 411 776.1 386.62C772.63 353.45 754.97 332.04 722.76 323.12C711.58 320.02 700.09 318.41 688.5 318.2C680.18 318.05 671.84 318.17 663.52 318.16C652.81 318.16 642.08 318.03 631.38 318.15C631.37 319.48 631.36 320.81 631.37 322.14C631.56 348.78 631.39 375.44 631.4 402.08C631.41 422.46 631.58 442.85 631.4 463.23C631.38 465.13 631.06 467.01 630.49 468.82C627.12 479.48 623.5 490.07 620.05 500.71C617.24 509.36 614.52 518.07 611.51 526.65C611.18 525.64 610.83 524.65 610.46 523.66C605.54 510.58 600.22 497.66 595.4 484.54C590.84 472.14 585.76 459.96 581.04 447.63C580.29 445.66 579.99 443.56 579.95 441.46C579.95 441.46 579.94 440.39 579.94 440.39C579.74 422.27 579.98 404.14 579.93 386.02C579.9 372.19 580.08 358.33 579.84 344.51C579.76 339.67 579.44 334.83 578.3 330.11C576.14 321.15 569.71 315.91 560.63 314.75C550.56 313.46 540.36 313.94 530.22 313.79L522.08 292.62Z M456.97 321.64C454.79 322.5 452.58 323.29 450.4 324.17C425.61 334.26 407.34 354.09 404.04 381.26C402.04 397.81 404.05 419.8 418.15 430.97C425.63 436.9 438.61 438.26 446.31 432.05C452.14 427.34 454.69 417.39 449.75 411.17C446.06 406.51 439.59 405.9 434.18 407.1C433.35 407.29 432.54 407.5 431.71 407.67C431.56 407.71 430.84 407.8 430.72 407.71C430.44 407.49 430.32 406.81 430.27 406.5C429.6 402.64 430.37 397.49 432.37 394.08C437.63 385.13 449.37 382.48 458.92 384.54C480.21 389.14 488.13 411.59 483.09 431.05C480.6 440.68 474.26 449.25 466.34 455.19C443.94 472 410.59 466.72 390.99 448.03C378.26 435.89 371.45 420 370.27 402.56C368.66 378.79 373.37 358.02 387.88 338.88C403.2 318.67 423.96 305.97 447.93 298.67L456.97 321.64Z M556.77 574.33C555.26 575.97 553.8 577.65 552.28 579.28C534.41 598.5 508.8 607.97 482.6 603.75C469.6 601.66 458.7 596.43 449.43 587.05C436.07 573.56 430.66 554.62 432.53 535.91C434.19 519.38 441.05 507.15 452.54 495.38C465.71 481.88 486.58 472.22 504.96 468.69C508.08 468.09 511.2 467.49 514.35 467.02L523.32 489.64C521.95 489.79 520.59 489.95 519.23 490.13C507.83 491.63 494.63 496.2 486.88 505.12C480.71 512.22 477.92 523.45 482.83 531.99C486.04 537.56 491.46 539.81 497.7 539.32C499.59 539.17 501.47 538.81 503.37 538.72C503.47 541.38 503.26 544.08 502.41 546.61C498.41 558.64 482.38 561.33 471.92 556.84C464.69 553.73 460.51 548.59 456.57 542C456.48 544.02 456.42 546.03 456.45 548.04C456.69 560.81 462.29 573.89 474.02 580.06C485.19 585.93 498.73 584.67 509.71 579.07C522.91 572.35 532.82 557.56 537.9 544C539.14 540.71 539.89 537.32 540.97 533.99L556.77 574.33Z M665.94 524.65C667.15 534.62 669.88 543.28 674.87 552.82C680.76 564.07 691.15 575 702.87 580.14C710.39 583.44 723.57 585.84 730 579.06C732.7 576.22 733.05 573.58 729.8 571.11C725.85 568.1 722.89 566.76 721.77 561.25C719.44 549.82 729.62 542.54 740.22 543.75C758.97 545.91 763.54 567.67 755.8 582.3C749.29 594.6 735.82 601.52 722.4 603.17C701.6 605.74 682.07 600 665.42 587.41C659.46 582.89 655.04 578.15 650.08 572.64L665.94 524.65Z M674.34 229.1L780.3 229.06L780.35 241.98C774.44 242.79 770.63 242.81 764.39 244.88C745.67 251.1 738.78 267.34 732.95 284.69C722.64 283.02 712.24 281.66 701.79 281.55C703.32 274.82 704.97 269.53 704.62 262.54C703.8 246.31 687.56 243.28 674.33 242.01L674.34 229.1Z M712.23 382.77C717.81 379.19 726.49 379.32 732.63 380.89C742.7 383.47 748.79 390.37 750.83 400.42C752.93 410.79 748.59 422.85 737.27 425.24C731.68 426.41 726.37 425.23 722.57 420.86C723.26 419.23 723.73 417.76 723.95 416C724.28 413.35 722.7 410.24 720.03 409.48C713.62 407.66 707.34 411.98 703.13 416.37C702.04 417.5 701 418.69 699.95 419.86L712.23 382.77Z";

/**
 * Format date cleanly for editorial header: e.g. "16 NOV 2026".
 */
export function formatSlideDate(dateInput?: Date | string | null): string {
  if (!dateInput) {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).toUpperCase();
  }
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).toUpperCase();
  }
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}

/**
 * Resolve Rubrik / Desk badge text.
 */
function resolveDeskName(article: ArticleForInstagram): string {
  if (typeof article.desk === "string" && article.desk.trim().length > 0) {
    return article.desk.toUpperCase();
  }
  if (article.desk && typeof article.desk === "object" && article.desk.name) {
    return article.desk.name.toUpperCase();
  }
  return "INVESTIGASI";
}

/**
 * Common Header on Every Slide:
 * VP Mark + "VERAX PRESS" + Rubrik Badge + Publication Date + Hairline Rule
 */
function buildSlideHeader(deskName: string, dateStr: string) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingBottom: "24px",
        borderBottom: "2px solid #E5DFD5",
      },
      children: [
        // Brand logo + wordmark
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "16px",
            },
            children: [
              {
                type: "svg",
                props: {
                  viewBox: "350 198 500 500",
                  width: 44,
                  height: 44,
                  children: [
                    {
                      type: "path",
                      props: {
                        fill: "#161310",
                        d: VERAX_MARK_PATH,
                      },
                    },
                  ],
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: "20px",
                    letterSpacing: "0.14em",
                    color: "#161310",
                  },
                  children: "VERAX PRESS",
                },
              },
            ],
          },
        },
        // Desk badge + date
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
            },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: "14px",
                    letterSpacing: "0.08em",
                    color: "#8B1E1E",
                    backgroundColor: "#F3ECE1",
                    padding: "6px 14px",
                    borderRadius: "4px",
                  },
                  children: deskName,
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: "Inter",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#4A453E",
                  },
                  children: dateStr,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Common Footer on Every Slide:
 * Motto "EX FONTIBUS VERITAS" + Watermark URL + Pagination Badge
 */
function buildSlideFooter(pageNumber: number, totalPages: number) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingTop: "20px",
        borderTop: "2px solid #E5DFD5",
      },
      children: [
        {
          type: "span",
          props: {
            style: {
              fontFamily: "Inter",
              fontSize: "14px",
              letterSpacing: "0.15em",
              fontWeight: 700,
              color: "#8B1E1E",
            },
            children: "EX FONTIBUS VERITAS",
          },
        },
        {
          type: "span",
          props: {
            style: {
              fontFamily: "Inter",
              fontSize: "15px",
              color: "#4A453E",
            },
            children: "veraxpress.vercel.app",
          },
        },
        {
          type: "span",
          props: {
            style: {
              fontFamily: "Inter",
              fontSize: "14px",
              fontWeight: 700,
              color: "#161310",
              backgroundColor: "#E5DFD5",
              padding: "4px 14px",
              borderRadius: "100px",
            },
            children: `${pageNumber} / ${totalPages}`,
          },
        },
      ],
    },
  };
}

/**
 * Build Cover Slide Template Node
 */
function buildCoverSlideNode(
  article: ArticleForInstagram,
  slide: SlideData,
  pageNumber: number,
  totalPages: number
) {
  const deskName = resolveDeskName(article);
  const dateStr = formatSlideDate(article.publishedAt);
  const headline = slide.title || article.title;
  const deck = slide.content || article.deck || "";
  const byline = article.byline || "Disunting oleh Redaksi Verax Press";
  const kicker = slide.kicker || "LAPORAN UTAMA";

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "1080px",
        height: "1080px",
        backgroundColor: "#FBF8F3",
        padding: "56px",
        boxSizing: "border-box",
      },
      children: [
        buildSlideHeader(deskName, dateStr),
        // Body
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "36px 0",
            },
            children: [
              // Kicker
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "20px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#8B1E1E",
                        },
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: "16px",
                          letterSpacing: "0.12em",
                          color: "#8B1E1E",
                        },
                        children: kicker.toUpperCase(),
                      },
                    },
                  ],
                },
              },
              // Headline
              {
                type: "h1",
                props: {
                  style: {
                    fontFamily: "Newsreader",
                    fontWeight: 700,
                    fontSize: headline.length > 90 ? "46px" : headline.length > 60 ? "52px" : "58px",
                    lineHeight: 1.18,
                    color: "#161310",
                    margin: "0 0 24px 0",
                    letterSpacing: "-0.02em",
                  },
                  children: headline,
                },
              },
              // Deck
              deck
                ? {
                    type: "p",
                    props: {
                      style: {
                        fontFamily: "Newsreader",
                        fontStyle: "italic",
                        fontSize: deck.length > 180 ? "26px" : "30px",
                        lineHeight: 1.38,
                        color: "#4A453E",
                        margin: "0 0 32px 0",
                      },
                      children: deck,
                    },
                  }
                : null,
              // Byline
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingTop: "16px",
                    borderTop: "1px solid #E5DFD5",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: "17px",
                          color: "#161310",
                        },
                        children: byline,
                      },
                    },
                  ],
                },
              },
            ].filter(Boolean),
          },
        },
        buildSlideFooter(pageNumber, totalPages),
      ],
    },
  };
}

/**
 * Build Content Slide Template Node
 */
function buildContentSlideNode(
  article: ArticleForInstagram,
  slide: SlideData,
  pageNumber: number,
  totalPages: number
) {
  const deskName = resolveDeskName(article);
  const dateStr = formatSlideDate(article.publishedAt);
  const kicker = slide.kicker || `TEMUAN ${pageNumber - 1}`;
  const title = slide.title || "";
  const content = slide.content || "";
  const sourceNotes = slide.sourceNotes || "";

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "1080px",
        height: "1080px",
        backgroundColor: "#FBF8F3",
        padding: "56px",
        boxSizing: "border-box",
      },
      children: [
        buildSlideHeader(deskName, dateStr),
        // Body
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "36px 0",
            },
            children: [
              // Kicker
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: "16px",
                          letterSpacing: "0.12em",
                          color: "#8B1E1E",
                        },
                        children: kicker.toUpperCase(),
                      },
                    },
                  ],
                },
              },
              // Slide title (if provided)
              title
                ? {
                    type: "h2",
                    props: {
                      style: {
                        fontFamily: "Newsreader",
                        fontWeight: 700,
                        fontSize: title.length > 70 ? "38px" : "44px",
                        lineHeight: 1.22,
                        color: "#161310",
                        margin: "0 0 20px 0",
                        letterSpacing: "-0.015em",
                      },
                      children: title,
                    },
                  }
                : null,
              // Main content text
              {
                type: "p",
                props: {
                  style: {
                    fontFamily: "Newsreader",
                    fontWeight: 400,
                    fontSize: content.length > 260 ? "27px" : content.length > 160 ? "31px" : "35px",
                    lineHeight: 1.44,
                    color: "#161310",
                    margin: "0 0 24px 0",
                  },
                  children: content,
                },
              },
              // Source Callout Box (if provided)
              sourceNotes
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#F3ECE1",
                        borderLeft: "4px solid #8B1E1E",
                        padding: "16px 20px",
                        borderRadius: "2px",
                        marginTop: "12px",
                      },
                      children: [
                        {
                          type: "span",
                          props: {
                            style: {
                              fontFamily: "Inter",
                              fontWeight: 700,
                              fontSize: "13px",
                              letterSpacing: "0.08em",
                              color: "#8B1E1E",
                              marginBottom: "4px",
                            },
                            children: "RUJUKAN SUMBER",
                          },
                        },
                        {
                          type: "span",
                          props: {
                            style: {
                              fontFamily: "Inter",
                              fontSize: "15px",
                              lineHeight: 1.35,
                              color: "#4A453E",
                            },
                            children: sourceNotes,
                          },
                        },
                      ],
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        buildSlideFooter(pageNumber, totalPages),
      ],
    },
  };
}

/**
 * Build Quote Slide Template Node
 */
function buildQuoteSlideNode(
  article: ArticleForInstagram,
  slide: SlideData,
  pageNumber: number,
  totalPages: number
) {
  const deskName = resolveDeskName(article);
  const dateStr = formatSlideDate(article.publishedAt);
  const quoteText = slide.content || "";
  const author = slide.quoteAuthor || slide.title || "Kutipan Dokumen / Narasumber";
  const authorTitle = slide.quoteAuthorTitle || slide.sourceNotes || "";

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "1080px",
        height: "1080px",
        backgroundColor: "#FBF8F3",
        padding: "56px",
        boxSizing: "border-box",
      },
      children: [
        buildSlideHeader(deskName, dateStr),
        // Body
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "36px 0",
            },
            children: [
              // Large quotation glyph
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: "Newsreader",
                    fontWeight: 700,
                    fontSize: "88px",
                    lineHeight: 0.8,
                    color: "#8B1E1E",
                    marginBottom: "16px",
                  },
                  children: "“",
                },
              },
              // Quote body
              {
                type: "p",
                props: {
                  style: {
                    fontFamily: "Newsreader",
                    fontStyle: "italic",
                    fontSize: quoteText.length > 200 ? "32px" : "38px",
                    lineHeight: 1.35,
                    color: "#161310",
                    margin: "0 0 28px 0",
                  },
                  children: quoteText,
                },
              },
              // Attribution
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    borderLeft: "3px solid #8B1E1E",
                    paddingLeft: "16px",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: "19px",
                          color: "#161310",
                        },
                        children: author,
                      },
                    },
                    authorTitle
                      ? {
                          type: "span",
                          props: {
                            style: {
                              fontFamily: "Inter",
                              fontSize: "15px",
                              color: "#4A453E",
                              marginTop: "4px",
                            },
                            children: authorTitle,
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
            ],
          },
        },
        buildSlideFooter(pageNumber, totalPages),
      ],
    },
  };
}

/**
 * Build Closing Slide Template Node
 */
function buildClosingSlideNode(
  article: ArticleForInstagram,
  slide: SlideData,
  pageNumber: number,
  totalPages: number
) {
  const deskName = resolveDeskName(article);
  const dateStr = formatSlideDate(article.publishedAt);
  const closingTitle = slide.title || "Poin Kunci Investigasi";
  const ctaText = slide.callToAction || "Baca investigasi selengkapnya di veraxpress.vercel.app";

  // Takeaways: either explicit array or parsed from content string
  let takeaways = slide.keyTakeaways;
  if (!takeaways || takeaways.length === 0) {
    if (slide.content && slide.content.trim().length > 0) {
      takeaways = slide.content
        .split("\n")
        .map((s) => s.replace(/^[-*•0-9.)\s]+/, "").trim())
        .filter((s) => s.length > 0)
        .slice(0, 3);
    }
  }
  if (!takeaways || takeaways.length === 0) {
    takeaways = [
      "Temuan diverifikasi silang dengan dokumen sumber primer.",
      "Seluruh salinan berkas tersedia terbuka pada pelaporan lengkap.",
      "Redaksi melayani hak jawab dan koreksi secara transparan.",
    ];
  }

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "1080px",
        height: "1080px",
        backgroundColor: "#FBF8F3",
        padding: "56px",
        boxSizing: "border-box",
      },
      children: [
        buildSlideHeader(deskName, dateStr),
        // Body
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "28px 0",
            },
            children: [
              // Kicker
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: "15px",
                    letterSpacing: "0.12em",
                    color: "#8B1E1E",
                    marginBottom: "12px",
                  },
                  children: "KESIMPULAN & RUJUKAN",
                },
              },
              // Title
              {
                type: "h2",
                props: {
                  style: {
                    fontFamily: "Newsreader",
                    fontWeight: 700,
                    fontSize: "40px",
                    lineHeight: 1.2,
                    color: "#161310",
                    margin: "0 0 24px 0",
                    letterSpacing: "-0.015em",
                  },
                  children: closingTitle,
                },
              },
              // Takeaway list
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    marginBottom: "28px",
                  },
                  children: takeaways.map((item, idx) => ({
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                      },
                      children: [
                        {
                          type: "span",
                          props: {
                            style: {
                              fontFamily: "Inter",
                              fontWeight: 700,
                              fontSize: "16px",
                              color: "#8B1E1E",
                              backgroundColor: "#F3ECE1",
                              width: "28px",
                              height: "28px",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            },
                            children: `0${idx + 1}`,
                          },
                        },
                        {
                          type: "span",
                          props: {
                            style: {
                              fontFamily: "Newsreader",
                              fontSize: "25px",
                              lineHeight: 1.35,
                              color: "#161310",
                              flex: 1,
                            },
                            children: item,
                          },
                        },
                      ],
                    },
                  })),
                },
              },
              // Prominent CTA Card
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#161310",
                    padding: "24px 28px",
                    borderRadius: "8px",
                    color: "#FBF8F3",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: "13px",
                          letterSpacing: "0.1em",
                          color: "#E5DFD5",
                          marginBottom: "6px",
                        },
                        children: "INVESTIGASI SELENGKAPNYA",
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Newsreader",
                          fontWeight: 700,
                          fontSize: "26px",
                          color: "#FBF8F3",
                          marginBottom: "6px",
                        },
                        children: ctaText,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: "Inter",
                          fontSize: "14px",
                          color: "#C5BEB5",
                        },
                        children:
                          "Disertai dokumen sumber asal, catatan metodologi liputan, dan keterbukaan koreksi publik.",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        buildSlideFooter(pageNumber, totalPages),
      ],
    },
  };
}

/**
 * Master dispatcher to build VNode for any slide index.
 */
function buildSlideNode(
  article: ArticleForInstagram,
  slide: SlideData,
  index: number,
  totalSlides: number
) {
  // Determine slide type
  let type: SlideType = slide.slideType || (index === 0 ? "cover" : "content");
  if (!slide.slideType) {
    if (index === 0) {
      type = "cover";
    } else if (index === totalSlides - 1 && totalSlides >= 2) {
      type = "closing";
    }
  }

  const pageNum = index + 1;

  switch (type) {
    case "cover":
      return buildCoverSlideNode(article, slide, pageNum, totalSlides);
    case "quote":
      return buildQuoteSlideNode(article, slide, pageNum, totalSlides);
    case "closing":
      return buildClosingSlideNode(article, slide, pageNum, totalSlides);
    case "content":
    default:
      return buildContentSlideNode(article, slide, pageNum, totalSlides);
  }
}

/**
 * Dual-engine SVG -> PNG conversion:
 * Uses fast native @resvg/resvg-js first, with seamless fallback to sharp.
 */
async function svgToPngBuffer(svg: string): Promise<Buffer> {
  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1080 },
    });
    return Buffer.from(resvg.render().asPng());
  } catch {
    return await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();
  }
}

/**
 * Auto-build default carousel slides from article metadata and text.
 */
export function buildDefaultSlidesFromArticle(article: ArticleForInstagram): SlideData[] {
  const slides: SlideData[] = [];

  // Slide 1: Cover
  slides.push({
    slideType: "cover",
    title: article.title,
    content: article.deck || "",
    kicker: "LAPORAN UTAMA",
  });

  // Slide 2: Latar Belakang / Konteks
  slides.push({
    slideType: "content",
    kicker: "FAKTA KUNCI",
    title: "Latar Belakang dan Konteks Masalah",
    content:
      article.deck ||
      "Penyelidikan berfokus pada dokumen kebijakan dan perbandingan data anggaran yang belum dipublikasikan secara terbuka kepada masyarakat.",
    sourceNotes: "Verifikasi dokumen sumber primer Verax Press.",
  });

  // Slide 3: Temuan Investigasi
  slides.push({
    slideType: "content",
    kicker: "TEMUAN INVESTIGASI",
    title: "Ketidaksesuaian Prosedur dan Alokasi Dana",
    content:
      "Analisis mendalam mengungkap kejanggalan dalam persetujuan izin administratif dan aliran dana yang tidak selaras dengan kerangka regulasi.",
    sourceNotes: "Salinan audit dan berita acara resmi.",
  });

  // Slide 4: Closing / Kesimpulan
  slides.push({
    slideType: "closing",
    title: "Poin Penting dan Langkah Lanjutan",
    content:
      "Temuan diverifikasi silang dengan dokumen sumber primer.\nSeluruh salinan berkas tersedia terbuka pada pelaporan lengkap.\nRedaksi melayani hak jawab dan koreksi secara transparan.",
    callToAction: "Baca investigasi selengkapnya di veraxpress.vercel.app",
  });

  return slides;
}

/**
 * Primary rendering function:
 * Renders an array of carousel slides into 1080x1080 PNG Buffers.
 *
 * @param article Article metadata
 * @param slides Array of slide definitions (if empty, auto-generates 4 default slides)
 * @returns Array of PNG Buffers, one for each slide
 */
export async function renderCarouselSlides(
  article: ArticleForInstagram,
  slides: SlideData[]
): Promise<Buffer[]> {
  const effectiveSlides =
    slides && slides.length > 0 ? slides : buildDefaultSlidesFromArticle(article);

  const fonts = getSatoriFonts();
  const buffers: Buffer[] = [];
  const total = effectiveSlides.length;

  for (let i = 0; i < total; i++) {
    const slide = effectiveSlides[i];
    const node = buildSlideNode(article, slide, i, total);

    const svg = await satori(node as never, {
      width: 1080,
      height: 1080,
      fonts: fonts as any,
    });

    const png = await svgToPngBuffer(svg);
    buffers.push(png);
  }

  return buffers;
}
