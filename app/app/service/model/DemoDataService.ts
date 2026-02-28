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
    phoneme_list: Set<string>,
    num_of_activities: number
  ): string {
    let activity_set: string = "";
    for (let i = 0; i < num_of_activities; i++) {
      activity_set += this.getDEMOActivity(phoneme_list);
    }
    return activity_set;
  }

  public getDEMOActivity(phoneme_set: Set<string>): string {
    const phonemes_array = Array.from(phoneme_set);
    let activity: string = ` * Playing ${this.getDEMOGame()} to practice ${
      phonemes_array[this.getDEMORandomInt(0, phonemes_array.length)]
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

  public collective_phoneme(phoneme_set: Set<string>): string {
    const phonemes_array = Array.from(phoneme_set);

    if (phonemes_array.length === 0) return `[None]`;
    if (phonemes_array.length === 1) return phonemes_array[0];

    const allButLast = phonemes_array.slice(0, -1).join(", ");
    const lastItem = phonemes_array[phonemes_array.length - 1];

    return `${allButLast}, and ${lastItem}`;
  }
}
