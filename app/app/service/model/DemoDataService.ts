export class DemoDataService {
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

  public getDEMOActivities(
    phoneme_list: string[],
    num_of_activities: number
  ): string {
    let activity_set: string = "";
    for (let i = 0; i < num_of_activities; i++) {
      activity_set += this.getDEMOActivity(phoneme_list);
    }
    return activity_set;
  }

  public getDEMOActivity(phoneme_list: string[]): string {
    let activity: string = ` * Playing ${this.getDEMOGame()} to practice ${
      phoneme_list[this.getDEMORandomInt(0, phoneme_list.length)]
    } for ${this.getDEMORandomInt(5, 30)} minutes.\n`;
    return activity;
  }

  public getDEMOSessionData(data: string[][]): string[][] {
    let reworked_data: string[][] = [];
    let j: number = data.length;

    const notes: string[] = [
      "Well done!",
      "Could use more practice",
      "Try again tomorrow",
      "Work with parent",
    ];

    for (let i = 0; i < data.length; i++) {
      reworked_data = [...reworked_data, data[i]];
      reworked_data[i][5] = (j - i).toString();
      reworked_data[i][6] = notes[this.getDEMORandomInt(0, 4)];
    }

    return reworked_data;
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

  public collective_phoneme(phoneme_list: string[]): string {
    if (phoneme_list.length === 0) return `[None]`;
    if (phoneme_list.length === 1) return phoneme_list[0];

    const allButLast = phoneme_list.slice(0, -1).join(", ");
    const lastItem = phoneme_list[phoneme_list.length - 1];

    return `${allButLast}, and ${lastItem}`;
  }

  public gather_data_collections(formatted_data: string[][]): {
    accuracy_list: string[];
    time_list: number[];
    phoneme_list: string[];
  } {
    let accuracy_list: string[] = [];
    let time_list: number[] = [];
    let phoneme_set: Set<string> = new Set();
    for (let i = 0; i < formatted_data.length; i++) {
      let row: string[] = formatted_data[i];
      accuracy_list = [...accuracy_list, row[4]];
      time_list = [...time_list, parseInt(row[5])];
      phoneme_set.add(row[1]);
    }
    const phoneme_list = Array.from(phoneme_set);
    return { accuracy_list, time_list, phoneme_list };
  }
}
