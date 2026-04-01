import fs from "fs";
import { Document, Packer, Paragraph, TextRun, ImageRun, HorizontalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionRelativeFrom, VerticalPositionAlign, TextWrappingType } from "docx";

const run = async () => {
    // create a dummy 1x1 image pixel just to test the API
    const base64Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const buf = Buffer.from(base64Pixel, "base64");

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: buf,
                            transformation: { width: 800, height: 1130 },
                            floating: {
                                horizontalPosition: {
                                    relative: HorizontalPositionRelativeFrom.PAGE,
                                    align: HorizontalPositionAlign.CENTER,
                                },
                                verticalPosition: {
                                    relative: VerticalPositionRelativeFrom.PAGE,
                                    align: VerticalPositionAlign.CENTER,
                                },
                                wrap: {
                                    type: TextWrappingType.NONE,
                                },
                                behindDocument: true,
                            }
                        }),
                        new TextRun({ text: "Hello World over Image!", size: 48, color: "000000" })
                    ]
                })
            ]
        }]
    });

    const out = await Packer.toBuffer(doc);
    fs.writeFileSync("test_bg.docx", out);
    console.log("Success");
};
run().catch(console.error);
