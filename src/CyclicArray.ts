export default class CyclicArray<T> {
  [key: number]: T | undefined | null;

  public static isCyclicArray(val: any): boolean {
    return val instanceof CyclicArray;
  }

  public static get [Symbol.species]() {
    return Array;
  }

  constructor(len?: number) {
    if (len) {
      for (let i = 0; i < len; i++) {
        this[i] = undefined;
      }
    }
  }

  public get length(): number {
    return Object.keys(this).map(a => parseInt(a)).length;
  }

  public set length(len: number) {
    if (this.length >= len) {
      for (let i = 0; i < this.length; i++) {
        if (i >= len) delete this[i];
      }
    } else {
      for (let i = 0; i < len; i++) {
        if (this.length <= i) this[i] = undefined;
      }
    }
  }

  public *[Symbol.iterator](): Iterator<T | undefined | null> {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }

  public *keys(): Iterator<number> {
    for (let i = 0; i < this.length; i++) {
      yield i;
    }
  }

  public *values(): Iterator<T | undefined | null> {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }

  public *entries(): Iterator<{ key: number; value: T | undefined | null }> {
    for (let i = 0; i < this.length; i++) {
      yield { key: i, value: this[i] };
    }
  }

  public concat(...args: T[] | Array<T>[] | CyclicArray<T>[]): CyclicArray<T> {
    let tmp = new CyclicArray<T>();
    for (let a of this) {
      tmp.push(a);
    }
    for (let e of args) {
      if (CyclicArray.isCyclicArray(e)) {
        for (let ee of e as CyclicArray<T>) {
          tmp.push(ee);
        }
      } else if (Array.isArray(e)) {
        for (let ee of e as Array<T>) {
          tmp.push(ee);
        }
      } else {
        tmp.push(e as T);
      }
    }
    return tmp;
  }

  public every(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => boolean
  ) {
    let every = true;
    for (let i = 0; i < this.length; i++) {
      if (!cb(this[i], i, this)) {
        every = false;
        break;
      }
    }
    return every;
  }

  public some(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => boolean
  ) {
    let some = false;
    for (let i = 0; i < this.length; i++) {
      if (cb(this[i], i, this)) {
        some = true;
        break;
      }
    }
    return some;
  }

  public fill(
    value: T | undefined | null,
    start: number = 0,
    end: number = this.length - 1
  ) {
    for (let i = start; i <= end; i++) {
      this[i] = value;
    }
    return this;
  }

  public filter(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => boolean
  ) {
    let filtered = new CyclicArray<T>();
    for (let i = 0; i < this.length; i++) {
      if (cb(this[i], i, this)) {
        filtered.push(this[i]);
      }
    }
    return filtered;
  }

  public push(val: T | undefined | null) {
    this[this.length] = val;
    return this.length;
  }

  public find(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => boolean
  ) {
    for (let i = 0; i < this.length; i++) {
      if (cb(this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  }

  public findIndex(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => boolean
  ) {
    for (let i = 0; i < this.length; i++) {
      if (cb(this[i], i, this)) {
        return i;
      }
    }
    return -1;
  }

  public flat(depth: number = 1): CyclicArray<T> {
    return depth > 0
      ? this.reduce(
          (a, b) =>
            a.concat(
              CyclicArray.isCyclicArray(b)
                ? (b as unknown as CyclicArray<T>).flat(depth - 1)
                : b
            ),
          new CyclicArray<T>()
        )
      : this.slice();
  }

  public reduce(
    cb: (
      accumulator: any,
      currentValue: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => any,
    initialValue?: any
  ): any {
    let i = initialValue !== undefined ? 0 : 1,
      reduced =
        initialValue !== undefined ? initialValue : new CyclicArray<T>();
    if (initialValue === undefined) reduced.push(this[i]);

    for (i; i < this.length; i++) {
      reduced = cb(reduced, this[i], i, this);
    }
    return reduced;
  }

  public slice(start: number = 0, end: number = this.length) {
    return this.filter((v, i, a) => {
      return i >= start && i < end;
    });
  }

  public forEach(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => any
  ) {
    for (let i = 0; i < this.length; i++) {
      cb(this[i], i, this);
    }
    return undefined;
  }
}
