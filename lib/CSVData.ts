export class CSVData {
  private _name: string;
  private _date: string;
  private _phoneme: string;
  private _attempt: number;
  private _correct: number;
  private _accuracy: string;
  private _minutes: number;
  private _game: string;

  public constructor(
    name: string,
    date: string,
    phoneme: string,
    attempt: number,
    correct: number,
    accuracy: string,
    minutes: number,
    game: string
  ) {
    this._name = name;
    this._date = date;
    this._phoneme = phoneme;
    this._attempt = attempt;
    this._correct = correct;
    this._accuracy = accuracy;
    this._minutes = minutes;
    this._game = game;
  }

  // Name
  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
  }

  // Date
  public get date(): string {
    return this._date;
  }

  public set date(value: string) {
    this._date = value;
  }

  // Phoneme
  public get phoneme(): string {
    return this._phoneme;
  }

  public set phoneme(value: string) {
    this._phoneme = value;
  }

  // Attempt
  public get attempt(): number {
    return this._attempt;
  }

  public set attempt(value: number) {
    this._attempt = value;
  }

  // Correct
  public get correct(): number {
    return this._correct;
  }

  public set correct(value: number) {
    this._correct = value;
  }

  // Accuracy
  public get accuracy(): string {
    return this._accuracy;
  }

  public set accuracy(value: string) {
    this._accuracy = value;
  }

  // Minutes
  public get minutes(): number {
    return this._minutes;
  }

  public set minutes(value: number) {
    this._minutes = value;
  }

  // Game
  public get game(): string {
    return this._game;
  }

  public set game(value: string) {
    this._game = value;
  }
}
