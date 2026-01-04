declare module 'spark-md5' {
  export class SparkMD5 {
    constructor();
    append(data: ArrayBuffer | string): this;
    end(raw?: boolean): string;

    static ArrayBuffer: {
      new (): {
        append(data: ArrayBuffer): void;
        end(raw?: boolean): string;
      };
    };
  }

  export default SparkMD5;
}
