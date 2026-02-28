import jsPDF from "jspdf";
import { CSVData } from "../../../../lib/CSVData";
import autoTable from "jspdf-autotable";

// Make the File
//   CSVData
// Download File
export class FileService {
  public async formatCsvFile(data: CSVData[]): Promise<void> {
    let csv_collection: string[][] = [];

    for (let i = 0; i < data.length; i++) {
      let row: CSVData = data[i];

      let csv_array: string[] = [
        row.date,
        row.phoneme,
        row.attempt.toString(),
        row.correct.toString(),
        row.accuracy,
        row.minutes.toString(),
        row.game,
      ];

      csv_collection = [...csv_collection, csv_array];
    }

    this.exportCsvFile(csv_collection, data[0].name);

    return;
  }

  public async exportCsvFile(
    formatted_data: string[][],
    name: string
  ): Promise<void> {
    const header = [
      "Date",
      "Phoneme",
      "Attempts",
      "Correct",
      "Accuracy",
      "Minutes",
      "Game",
    ];
    const rows = [header, ...formatted_data];

    let displayName: string = "";
    if (name == "") {
      displayName = "All_Student";
    } else {
      displayName = name.split(" ").join("_");
    }

    const csvContent = rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayName}_Progress_Report.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  public average_accuracy(acc_list: string[]): string {
    let total = 0;
    for (let i = 0; i < acc_list.length; i++) {
      acc_list[i] = acc_list[i].replace("%", "");
      total = total + parseInt(acc_list[i]);
    }

    total = Math.ceil(total / acc_list.length);

    return `${total.toString()}%`;
  }

  public total_minutes(acc_list: number[]): string {
    let total = 0;
    for (let i = 0; i < acc_list.length; i++) {
      total = total + acc_list[i];
    }

    return `${total.toString()}`;
  }

  public collective_phoneme(phoneme_set: Set<string>): string {
    const phonemes_array = Array.from(phoneme_set);

    if (phonemes_array.length === 0) return `[None]`;
    if (phonemes_array.length === 1) return phonemes_array[0];

    const allButLast = phonemes_array.slice(0, -1).join(", ");
    const lastItem = phonemes_array[phonemes_array.length - 1];

    return `${allButLast}, and ${lastItem}`;
  }

  public async formatPdfFile(data: CSVData[]): Promise<void> {
    let csv_collection: string[][] = [];
    let accuracy: string[] = [];
    let total_time: number[] = [];
    let phoneme_list: Set<string> = new Set();

    for (let i = 0; i < data.length; i++) {
      let row: CSVData = data[i];
      accuracy = [...accuracy, row.accuracy];
      total_time = [...total_time, row.minutes];
      phoneme_list.add(row.phoneme);

      let csv_array: string[] = [
        row.date,
        row.phoneme,
        row.attempt.toString(),
        row.correct.toString(),
        row.accuracy,
        row.minutes.toString(),
        row.game,
      ];

      csv_collection = [...csv_collection, csv_array];
    }

    const averaged_accuracy = this.average_accuracy(accuracy);
    const total_minutes = this.total_minutes(total_time);

    await this.exportPdfFile(
      csv_collection,
      data[0].name,
      averaged_accuracy,
      total_minutes,
      phoneme_list
    );

    return;
  }

  public async exportPdfFile(
    formatted_data: string[][],
    name: string,
    average_accuracy: string,
    total_minutes: string,
    phoneme_list: Set<string>
  ): Promise<void> {
    const doc = new jsPDF();

    const streak = this.getDEMORandomInt(0, 75);

    const header = [
      "Date",
      "Phoneme",
      "Attempts",
      "Correct",
      "Accuracy",
      "Minutes",
      "Game",
    ];

    const rows = formatted_data;

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
      { title: "Avg Accuracy", value: average_accuracy },
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

    const overall_para: string = `${displayName} should practice the following phonemes: ${this.collective_phoneme(
      phoneme_list
    )}. They can practice these with family, friends, or using the game(s): ${this.getDEMOGame()}`;

    // ---- Summary Headers ----
    const sectionTitles = ["Overall Goal", "Objectives", "Results"];
    let paragraphTexts = [
      overall_para,
      "We aim to increase social media presence, optimize content delivery, and enhance customer support.",
      "The expected results include higher retention rates, increased traffic, and stronger brand loyalty.",
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
    doc.text("Progress Graph", 10, currentY);
    currentY += 8;

    const graphHeight = 60;

    // Placeholder box
    doc.rect(10, currentY, pageWidth - 20, graphHeight);
    doc.text(
      "Graph PNG will render here",
      pageWidth / 2,
      currentY + graphHeight / 2,
      {
        align: "center",
      }
    );

    currentY += graphHeight + 15;

    // ---- Table ----
    // autoTable(doc, {
    //   startY: 45,
    //   head: [header],
    //   body: rows,
    //   styles: {
    //     fontSize: 9,
    //   },
    //   headStyles: {
    //     fillColor: [228, 91, 62],
    //   },
    // });

    const img = new Image();
    img.src = "/assets/favicon.png";

    img.onload = () => {
      doc.setPage(1);
      doc.addImage(img, "PNG", 10, 10, 25, 25);
      doc.save(`${fileName}_Progress_Report.pdf`);
    };
  }

  public getDEMOGame() {
    const games = ["DJ Dino", "Safari Jeep", "Fishing Dock"];
    let res = games.slice(this.getDEMORandomInt(1, 3));

    if (res.length === 0) return `[None]`;
    if (res.length === 1) return res[0];

    const allButLast = res.slice(0, -1).join(", ");
    const lastItem = res[res.length - 1];

    return `${allButLast}, and ${lastItem}`;
  }

  public getDEMORandomInt(min: number, max: number): number {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
  }
}
