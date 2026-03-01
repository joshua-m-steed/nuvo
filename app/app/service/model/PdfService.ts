import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileService } from "./FileService";

export class PdfService extends FileService {
  protected async exportData(
    formatted_data: string[][],
    name: string
  ): Promise<void> {
    const doc = new jsPDF();

    let displayName: string = "";
    if (name === "") {
      displayName = "All Students";
    } else {
      displayName = name;
    }

    let fileName: string = "";
    if (name == "") {
      fileName = "All_Student";
    } else {
      fileName = name.split(" ").join("_");
    }

    const reportTitle = `${displayName} - Progress Report`;

    // ---- Add Report Title (Centered) ----
    this.makeTitle(doc, reportTitle);
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 45;
    // ---- Box Summaries ----
    currentY = this.makeSummaryBoxes(doc, pageWidth, currentY, formatted_data);

    // SUMMARY SECTION
    currentY = this.makeSummaryStatements(
      doc,
      currentY,
      pageWidth,
      displayName,
      formatted_data
    );

    // ---- Graph Placeholder ----
    currentY = this.makeGraph(doc, currentY, pageWidth);

    this.makeDataTables(doc, formatted_data);

    const img = new Image();
    img.src = "/assets/favicon.png";

    img.onload = () => {
      doc.setPage(1);
      doc.addImage(img, "PNG", 10, 10, 25, 25);
      doc.save(`${fileName}_Progress_Report.pdf`);
    };
  }

  private makeTitle(doc: jsPDF, title: string) {
    this.setFont(doc, 16, "bold");

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, pageWidth / 2, 30, { align: "center" });
    let date = new Date();
    const formattedDateTime = date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const created_message = `Created: ${formattedDateTime}`;

    this.setFont(doc, 9, "normal");
    doc.text(created_message, pageWidth - 10, 20, { align: "right" });

    doc.setLineWidth(0.5);
    doc.line(10, 35, pageWidth - 10, 35);
  }

  private makeSummaryBoxes(
    doc: jsPDF,
    pageWidth: number,
    currentY: number,
    formatted_data: string[][]
  ): number {
    const boxWidth = (pageWidth - 40) / 3;
    const boxHeight = 30;
    const spacing = 10;

    const { accuracy_list, time_list } =
      this.demoDataService.gather_data_collections(formatted_data);

    const averaged_accuracy =
      this.demoDataService.average_accuracy(accuracy_list);

    const total_minutes = this.demoDataService.total_minutes(time_list);
    const streak = this.demoDataService.getDEMORandomInt(0, 75);

    const metrics = [
      { title: "Avg Accuracy", value: averaged_accuracy },
      { title: "Mins", value: total_minutes },
      { title: "Streak", value: streak.toString() },
    ];

    this.setFont(doc, 11, "bold");

    metrics.forEach((metric, index) => {
      this.createDisplayBox(
        doc,
        metric,
        index,
        boxWidth,
        boxHeight,
        spacing,
        currentY
      );
    });

    currentY += boxHeight + 15;

    doc.setTextColor(0, 0, 0);

    return currentY;
  }

  private createDisplayBox(
    doc: jsPDF,
    metric: {
      title: string;
      value: string;
    },
    index: number,
    boxWidth: number,
    boxHeight: number,
    spacing: number,
    currentY: number
  ) {
    const x = 10 + index * (boxWidth + spacing);

    // Rounded rectangle
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 5, 5);

    // Title
    doc.setTextColor(228, 91, 62);
    doc.text(metric.title, x + boxWidth / 2, currentY + 10, {
      align: "center",
    });

    // Value
    this.setFont(doc, 16, "bold");
    doc.text(metric.value, x + boxWidth / 2, currentY + 22, {
      align: "center",
    });

    this.setFont(doc, 11, "bold");
  }

  private makeSummaryStatements(
    doc: jsPDF,
    currentY: number,
    pageWidth: number,
    displayName: string,
    formatted_data: string[][]
  ): number {
    const { accuracy_list, phoneme_list } =
      this.demoDataService.gather_data_collections(formatted_data);
    const overall_paragraph: string = `${displayName} should practice the following phonemes: ${this.demoDataService.collective_phoneme(
      phoneme_list
    )}. They can practice these with family, friends, or using the game(s): ${this.demoDataService.getDEMOGame()}.\n`;

    const objective_paragraph: string = `${displayName} can accomplish this goal by doing the following: \n${this.demoDataService.getDEMOActivities(
      phoneme_list,
      this.demoDataService.getDEMORandomInt(1, 5)
    )}`;

    const averaged_accuracy =
      this.demoDataService.average_accuracy(accuracy_list);

    const current_result_paragraph: string = `${displayName} ${
      displayName == "All Students" ? "were" : "was"
    } able to produce ${
      phoneme_list[
        this.demoDataService.getDEMORandomInt(0, phoneme_list.length)
      ]
    } with ${averaged_accuracy} as measured by SLP data taken over ${this.demoDataService.getDEMORandomInt(
      2,
      15
    )} sessions!\n`;

    // ---- Summary Headers ----
    const sectionTitles = ["Overall Goal", "Objectives", "Results"];
    let paragraphTexts = [
      overall_paragraph,
      objective_paragraph,
      current_result_paragraph,
    ];

    this.setFont(doc, 12, "bold");

    for (let i = 0; i < sectionTitles.length; i++) {
      // Title
      this.setFont(doc, 12, "bold");
      doc.text(sectionTitles[i], 10, currentY);
      currentY += 6;

      // Paragraph
      this.setFont(doc, 10, "normal");
      const splitText = doc.splitTextToSize(paragraphTexts[i], pageWidth - 20);
      doc.text(splitText, 10, currentY);

      currentY += splitText.length * 5;
    }

    return currentY;
  }

  private makeGraph(doc: jsPDF, currentY: number, pageWidth: number): number {
    this.setFont(doc, 12, "bold");
    doc.text("Progress Graph", 10, currentY);
    currentY += 8;

    const graphHeight = 100;

    doc.rect(10, currentY, pageWidth - 20, graphHeight);
    doc.addImage(
      "/assets/demo_graph.png",
      "PNG",
      10,
      currentY,
      pageWidth - 20,
      graphHeight
    );

    currentY += graphHeight + 15;

    return currentY;
  }

  private makeDataTables(doc: jsPDF, formatted_data: string[][]) {
    const homework = structuredClone(formatted_data);

    const sessions = this.demoDataService.getDEMOSessionData(
      structuredClone(formatted_data)
    );

    const session_header = [
      "Date",
      "Phoneme",
      "Attempts",
      "Correct",
      "Accuracy",
      "Sessions",
      "Notes",
    ];
    this.createTable(doc, "Sessions", session_header, sessions);

    const homework_header = [
      "Date",
      "Phoneme",
      "Attempts",
      "Correct",
      "Accuracy",
      "Minutes",
      "Game",
    ];
    this.createTable(doc, "Homework", homework_header, homework);
  }

  private createTable(
    doc: jsPDF,
    data_name: string,
    data_header: string[],
    data_set: string[][]
  ) {
    doc.addPage();
    doc.setPage(doc.getNumberOfPages());

    this.setFont(doc, 12, "bold");
    doc.text(data_name, 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [data_header],
      body: data_set,
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [228, 91, 62],
      },
    });
  }

  private setFont(doc: jsPDF, size: number, type: string) {
    doc.setFontSize(size);
    doc.setFont("helvetica", type);
  }
}
