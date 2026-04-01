import fs from "fs";
import sharp from "sharp";
import { Document, Packer, Paragraph, TextRun, ImageRun, HorizontalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionRelativeFrom, VerticalPositionAlign, TextWrappingType, PageBreak, AlignmentType, FrameAnchorType } from "docx";

const FONT = "Century Gothic"; // Premium looking sans-serif standard in word
const WHITE = "FFFFFF";
const GOLD = "D4AF37";
const GRAY = "CCCCCC";

export const testCover = async () => {
    // We are creating an A4 size page at 144 DPI (1190x1684)
    const svg = `
<svg width="1190" height="1684" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0F172A" />
            <stop offset="60%" stop-color="#1E1B4B" />
            <stop offset="100%" stop-color="#312E81" />
        </linearGradient>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="150" />
        </filter>
        <filter id="shadow">
            <feDropShadow dx="0" dy="15" stdDeviation="20" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
        <filter id="softGlow">
            <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    <!-- Background -->
    <rect width="1190" height="1684" fill="url(#bgGrad)" />
    
    <!-- Abstract blurred shapes -->
    <circle cx="20%" cy="10%" r="350" fill="#38BDF8" opacity="0.2" filter="url(#blur)" />
    <circle cx="90%" cy="40%" r="450" fill="#D946EF" opacity="0.15" filter="url(#blur)" />
    <circle cx="30%" cy="85%" r="400" fill="#6366F1" opacity="0.2" filter="url(#blur)" />
    
    <!-- Diagonal subtle lines simulating glass -->
    <path d="M-100,-100 L1290,1784" stroke="rgba(255,255,255,0.03)" stroke-width="40" stroke-linecap="round" />
    <path d="M300,-100 L1690,1784" stroke="rgba(255,255,255,0.02)" stroke-width="60" stroke-linecap="round" />
    
    <!-- High-end elegant Border -->
    <rect x="40" y="40" width="1110" height="1604" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
    <rect x="50" y="50" width="1090" height="1584" fill="none" stroke="rgba(212,175,55,0.3)" stroke-width="1" />

    <!-- Placeholder Logo Box -->
    <rect x="520" y="270" width="150" height="150" fill="none" stroke="#D4AF37" stroke-width="1" stroke-dasharray="10,5" rx="75" filter="url(#softGlow)" />
    <text x="595" y="340" font-family="sans-serif" font-size="20" font-weight="bold" fill="#D4AF37" text-anchor="middle" alignment-baseline="middle">University</text>
    <text x="595" y="365" font-family="sans-serif" font-size="20" font-weight="bold" fill="#D4AF37" text-anchor="middle" alignment-baseline="middle">Logo Here</text>
    
    <!-- Illustration Box Placeholder with Soft Shadow & Border -->
    <rect x="295" y="660" width="600" height="300" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" rx="15" filter="url(#shadow)" />
    
    <!-- Cards for Student Details and Guide Details -->
    <rect x="150" y="1150" width="380" height="220" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" rx="12" filter="url(#shadow)" />
    <rect x="660" y="1150" width="380" height="220" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" rx="12" filter="url(#shadow)" />
</svg>`;
    const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    
    // We will build the doc to see where the text aligns!
    
    const centerPara = (text, size, bold, color, spacingBefore, spacingAfter) => new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: spacingBefore || 0, after: spacingAfter || 0 },
        children: [new TextRun({ text, size, font: FONT, bold, color, tracking: 10 })]
    });

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 1440, bottom: 720, left: 1440 }, // Top/bottom: 0.5 inch (720), LR: 1 inch (1440)
                    size: { width: 11905, height: 16837 } // A4 exactly in TWIPs
                }
            },
            children: [
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: bgBuffer,
                            transformation: { width: 794, height: 1123 }, // 96 DPI dimensions for exactly A4 word canvas
                            floating: {
                                horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
                                verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
                                wrap: { type: TextWrappingType.NONE },
                                behindDocument: true,
                            }
                        })
                    ]
                }),
                // NOW TEXT
                centerPara("DHARANIDHAR UNIVERSITY, KEONJHAR", 36, true, WHITE, 600, 100),
                centerPara("(Erstwhile Dharanidhar Auto College, Keonjhar)", 22, false, GRAY, 0, 0),
                centerPara("Maharaja Sriram Chandra Bhanja Deo University", 22, false, GRAY, 0, 4800), // spacing to push down past logo
                
                centerPara("PROJECT REPORT ON", 28, false, GRAY, 0, 200),
                centerPara("RentEase", 56, true, GOLD, 0, 100),
                centerPara("– Smart Rental Property Management System –", 28, false, WHITE, 0, 4800), // spacing past image box
                
                centerPara("Submitted in Partial Fulfillment for Award of", 22, false, GRAY, 0, 100),
                centerPara("Degree in B.Sc in Computer Science", 28, true, WHITE, 0, 200),
                centerPara("( BATCH 2022 – 2025 )", 24, true, GOLD, 0, 1800), // push down to cards
                
                // Cards logic
                // Using a table for perfect two-column split
                // We'll see if we can align it to the boxes. Total width between LR margins is 11905 - 2880 = 9025 twips.
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "APRIL 2025", size: 28, bold: true, color: WHITE })],
                    spacing: { before: 2000 }
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("RentEase_Test_Cover.docx", buffer);
    console.log("Successfully generated RentEase_Test_Cover.docx");
};

testCover().catch(console.error);
