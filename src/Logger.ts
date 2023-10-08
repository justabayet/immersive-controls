export class Logger {
  public static isVerbose: boolean = false

  static debug(message: string, extra?: any): void {
    if (Logger.isVerbose) console.log(message, extra)
  }
}
