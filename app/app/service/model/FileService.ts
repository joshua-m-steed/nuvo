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

  public async formatPdfFile(data: CSVData[]): Promise<void> {
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

    this.exportPdfFile(csv_collection, data[0].name);

    return;
  }

  public async exportPdfFile(
    formatted_data: string[][],
    name: string
  ): Promise<void> {
    const doc = new jsPDF();

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

    // ---- Display Name ----
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

    // ---- Table ----
    autoTable(doc, {
      startY: 45,
      head: [header],
      body: rows,
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
