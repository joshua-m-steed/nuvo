import { CSVData } from "../../../../lib/CSVData";

// Make the File
//   CSVData
// Download File
export class FileService {
  public async formatFile(data: CSVData[]): Promise<void> {
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

    this.exportFile(csv_collection, data[0].name);

    return;
  }

  public async exportFile(
    formated_data: string[][],
    name: string
  ): Promise<void> {
    const rows = formated_data;

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
}
