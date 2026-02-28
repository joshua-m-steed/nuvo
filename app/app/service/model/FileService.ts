import { CSVData } from "../../../../lib/CSVData";
import { DemoDataService } from "./DemoDataService";

export abstract class FileService {
  private _demoDataService: DemoDataService;

  constructor() {
    this._demoDataService = new DemoDataService();
  }

  public get demoDataService() {
    return this._demoDataService;
  }

  public async saveFile(data: CSVData[]): Promise<void> {
    const { formatted_data, name } = await this.formatData(data);
    await this.exportData(formatted_data, name);
  }

  private async formatData(
    data: CSVData[]
  ): Promise<{ formatted_data: string[][]; name: string }> {
    let formatted_data: string[][] = [];
    const name = data[0].name;

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

      formatted_data = [...formatted_data, csv_array];
    }

    return { formatted_data, name };
  }

  protected abstract exportData(
    formatted_data: string[][],
    name: string
  ): Promise<void>;
}
