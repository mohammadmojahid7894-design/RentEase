const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell, Borders, BorderStyle, WidthType } = require('docx');

async function createCoverPage() {
    // Basic image loading safely
    let logoImage = null;
    let mainImage = null;
    
    try {
        logoImage = fs.readFileSync('university_logo.png');
    } catch(e) { console.log("Logo not found"); }
    
    try {
        mainImage = fs.readFileSync('rentease_illustration.png');
    } catch(e) { console.log("Main illustration not found"); }

    const children = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "DHARANIDHAR UNIVERSITY, KEONJHAR", bold: true, size: 44, font: "Montserrat" }), // 22pt
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: "(Erstwhile Dharanidhar Auto College, Keonjhar)", size: 22, font: "Montserrat", color: "555555" }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({ text: "Maharaja Sriram Chandra Bhanja Deo University", size: 22, font: "Montserrat", color: "555555" }),
            ],
        })
    ];

    if (logoImage) {
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new ImageRun({
                    data: logoImage,
                    transformation: { width: 150, height: 150 }
                })
            ]
        }));
    }

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "PROJECT REPORT ON", size: 28, font: "Montserrat", color: "444444" }), // 14pt
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "RentEase ", bold: true, size: 48, font: "Montserrat", color: "D4AF37" }), // Gold
                new TextRun({ text: "– Smart Rental", bold: true, size: 40, font: "Montserrat" }),
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({ text: "Property Management System", bold: true, size: 40, font: "Montserrat" }),
            ]
        })
    );

    if (mainImage) {
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new ImageRun({
                    data: mainImage,
                    transformation: { width: 400, height: 230 }
                })
            ]
        }));
    }

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: "Submitted in Partial Fulfillment for Award of", size: 24, font: "Montserrat", color: "444444" }),
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: "Degree in B.Sc in Computer Science", bold: true, size: 28, font: "Montserrat" }),
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({ text: "(BATCH 2022 – 2025)", bold: true, size: 24, font: "Montserrat", color: "D4AF37" }),
            ]
        }),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Submitted By:", bold: true, size: 24, color: "666666" })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BISWAJIT SAHOO", bold: true, size: 28 })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Roll No: 2322D011", size: 22, color: "555555" })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Regd No: 17346/22", size: 22, color: "555555" })] }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Under the Esteemed Guidance of:", bold: true, size: 24, color: "666666" })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MR. SHUBHASHISH BEHERA", bold: true, size: 28 })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Department of Computer Science", size: 22, color: "555555" })] }),
                            ],
                        }),
                    ],
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 100 },
            children: [
                new TextRun({ text: "_________________________", bold: true, size: 24, color: "D4AF37" }),
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "APRIL 2025", bold: true, size: 28 }),
            ]
        })
    );

    const doc = new Document({
        sections: [{
            properties: {
                page: { margin: { top: 1200, bottom: 1200, left: 1440, right: 1440 } }
            },
            children: children
        }]
    });

    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync("RentEase_Front_Page.docx", buffer);
        console.log("Document created successfully at RentEase_Front_Page.docx");
    });
}

createCoverPage().catch(console.error);
