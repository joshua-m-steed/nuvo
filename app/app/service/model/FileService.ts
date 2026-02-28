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

  public async saveFile(data: CSVData[]): Promise<void> {}

  protected abstract formatData(data: CSVData[]): Promise<void>;

  protected abstract exportData(
    formatted_data: string[][],
    name: string,
    accuracy_list?: string[],
    collected_time?: number[],
    phoneme_set?: Set<string>
  ): Promise<void>;
}
