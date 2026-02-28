import { CSVData } from "../../../../lib/CSVData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileService } from "./FileService";

export class PdfService extends FileService {
  protected async exportData(
    formatted_data: string[][],
    name: string
  ): Promise<void> {
    const doc = new jsPDF();
    const { accuracy_list, time_list, phoneme_list } =
      this.demoDataService.gather_data_collections(formatted_data);

    const averaged_accuracy =
      this.demoDataService.average_accuracy(accuracy_list);
    const total_minutes = this.demoDataService.total_minutes(time_list);

    const streak = this.demoDataService.getDEMORandomInt(0, 75);

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
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(reportTitle, pageWidth / 2, 30, { align: "center" });
    let date = new Date();
    const formattedDateTime = date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const created_message = `Created: ${formattedDateTime}`;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(created_message, pageWidth - 10, 20, { align: "right" });

    // ---- Horizontal Line ----
    doc.setLineWidth(0.5);
    doc.line(10, 35, pageWidth - 10, 35);

    // ---- Box Summaries ----
    let currentY = 45;
    const boxWidth = (pageWidth - 40) / 3;
    const boxHeight = 30;
    const spacing = 10;

    const metrics = [
      { title: "Avg Accuracy", value: averaged_accuracy },
      { title: "Mins", value: total_minutes },
      { title: "Streak", value: streak.toString() },
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    metrics.forEach((metric, index) => {
      const x = 10 + index * (boxWidth + spacing);

      // Rounded rectangle
      doc.roundedRect(x, currentY, boxWidth, boxHeight, 5, 5);

      // Title
      doc.setTextColor(228, 91, 62);
      doc.text(metric.title, x + boxWidth / 2, currentY + 10, {
        align: "center",
      });

      // Value
      doc.setFontSize(16);
      doc.text(metric.value, x + boxWidth / 2, currentY + 22, {
        align: "center",
      });

      doc.setFontSize(11);
    });

    currentY += boxHeight + 15;

    doc.setTextColor(0, 0, 0);

    const overall_paragraph: string = `${displayName} should practice the following phonemes: ${this.demoDataService.collective_phoneme(
      phoneme_list
    )}. They can practice these with family, friends, or using the game(s): ${this.demoDataService.getDEMOGame()}.\n`;

    const objective_paragraph: string = `${displayName} can accomplish this goal by doing the following: \n${this.demoDataService.getDEMOActivities(
      phoneme_list,
      this.demoDataService.getDEMORandomInt(1, 5)
    )}`;

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    for (let i = 0; i < sectionTitles.length; i++) {
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(sectionTitles[i], 10, currentY);
      currentY += 6;

      // Paragraph
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(paragraphTexts[i], pageWidth - 20);
      doc.text(splitText, 10, currentY);

      currentY += splitText.length * 5;
    }

    // ---- Graph Placeholder ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Progress Graph", 10, currentY);
    currentY += 8;

    const graphHeight = 100;

    // Placeholder box
    doc.rect(10, currentY, pageWidth - 20, graphHeight);
    doc.addImage(
      "/assets/demo_graph.png",
      "PNG",
      10,
      currentY,
      pageWidth - 20,
      graphHeight
    );
    // doc.text(
    //   "Graph PNG will render here",
    //   pageWidth / 2,
    //   currentY + graphHeight / 2,
    //   {
    //     align: "center",
    //   }
    // );

    currentY += graphHeight + 15;

    const homework = structuredClone(formatted_data);

    const sessions = this.demoDataService.getDEMOSessionData(
      structuredClone(formatted_data)
    );

    // ---- Table ----
    doc.addPage();
    doc.setPage(doc.getNumberOfPages());

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Sessions", 14, 15);

    const session_header = [
      "Date",
      "Phoneme",
      "Attempts",
      "Correct",
      "Accuracy",
      "Sessions",
      "Notes",
    ];

    autoTable(doc, {
      startY: 20,
      head: [session_header],
      body: sessions,
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [228, 91, 62],
      },
    });

    // ---- Table2 ----
    doc.addPage();
    doc.setPage(doc.getNumberOfPages());

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Homework", 14, 15);

    const header = [
      "Date",
      "Phoneme",
      "Attempts",
      "Correct",
      "Accuracy",
      "Minutes",
      "Game",
    ];

    autoTable(doc, {
      startY: 20,
      head: [header],
      body: homework,
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [228, 91, 62],
      },
    });

    const img = new Image();
    img.src = "/assets/favicon.png";

    img.onload = () => {
      doc.setPage(1);
      doc.addImage(img, "PNG", 10, 10, 25, 25);
      doc.save(`${fileName}_Progress_Report.pdf`);
    };
  }
}
