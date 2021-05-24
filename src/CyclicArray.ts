export default class CyclicArray<T> {
  [key: number]: T | undefined | null;

  public static isCyclicArray(val: any): boolean {
    return val instanceof CyclicArray;
  }

  public static get [Symbol.species]() {
    return Array;
  }

  public static of(...args: any) {
    let of = new this();
    for (let val of args) {
      of.push(val);
    }
    return of;
  }
  
  constructor(len?: number) {
    if (len) {
      for (let i = 0; i < len; i++) {
        this[i] = undefined;
      }
    }
  }

  public get length(): number {
    return [...this].length;
  }

  public set length(len: number) {
    if (this.length >= len) {
      for (let key of this.keys()) {
        if (key >= len) delete this[key];
      }
    } else {
      for (let key of this.keys()) {
        if (this.length <= key) this[key] = undefined;
      }
    }
  }

  public *[Symbol.iterator]() {
    for (let key of Object.keys(this)) {
      yield this[parseInt(key)];
    }
  }

  public *keys() {
    for (let key of Object.keys(this)) {
      yield parseInt(key);
    }
  }

  public *values() {
    for (let key of Object.keys(this)) {
      yield this[parseInt(key)];
    }
  }

  public *entries() {
    for (let key of Object.keys(this)) {
      yield {key: parseInt(key), value: this[parseInt(key)]};
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
    for (let {key, value} of this.entries()) {
      if (!cb(value, key, this)) {
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
    for (let {key, value} of this.entries()) {
      if (cb(value, key, this)) {
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
    for (let {key, value} of this.entries()){
      if (cb(value, key, this)) {
        filtered.push(value);
      }
    }
    return filtered;
  }

  public push(val: T | undefined | null) {
    if (Object.keys(this).length < 1) {
      this[0] = val;
    } else {
      const _keys = [...this.keys()],
        nextKey = _keys[_keys.length - 1] + 1;
      this[nextKey] = val;
    }
    return this.length;
  }

  public find(
    cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
    ) => boolean
  ) {
    for (let {key, value} of this.entries()) {
      if (cb(value, key, this)) {
        return value;
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
    for (let {key, value} of this.entries()) {
      if (cb(value, key, this)) {
        return key;
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

  public flatMap(cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
  ) => any): CyclicArray<any> {
    let mapped = this.map(cb);
    return mapped.flat();
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
        initialValue !== undefined ? initialValue : new CyclicArray<T>(1).fill(this[i]);

    for (let {key, value} of this.entries()) {
      reduced = cb(reduced, value, key, this);
    }
    return reduced;
  }

  public reduceRight(cb: (
    accumulator: any,
    currentValue: T | undefined | null,
    index: number,
    cyclicArray: CyclicArray<T>
  ) => any,
  initialValue?: any) {
    let i = initialValue !== undefined ? this.length - 2 : this.length - 1,
      reduced = initialValue !== undefined ? initialValue : new CyclicArray<T>(1).fill(this[i]);
    const entries = [...this.entries()];
    for (i; i > 0; i--) {
      reduced = cb(reduced, entries[i].value, entries[i].key, this);
    }
    return reduced;
  }

  public slice(start: number = 0, end: number = this.length): CyclicArray<T> {
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
  ):void {
    for (let {key, value} of this.entries()) {
      cb(value, key, this);
    }
    return undefined;
  }

  public includes(val: T, fromIndex: number = 0): boolean {
    for (let { key, value } of this.entries()) {
      if (key < fromIndex) continue;
      if (value === val) return true;
    }
    return false;
  }

  public indexOf(val: T, fromIndex: number = 0): number {
    for (let { key, value } of this.entries()) {
      if (key < fromIndex) continue;
      if (value === val) return key;
    }
    return -1;
  }

  public join(separator: string = ','): string {
    let string = '';
    let entries = [...this.entries()];
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].value === undefined || entries[i].value === null || (entries[i].value as unknown as Array<any>).length < 1 || (entries[i].value as unknown as CyclicArray<any>).length < 1) string += '';
      else string += (entries[i].value as unknown as Object).toString();
      if (i < this.length - 1) string += separator;
    }
    return string;
  }

  public lastIndexOf(val: T, fromIndex: number = this.length - 1): number {
    if (this.length === 0) return -1;
    let entries = Array.from(this.entries());
    for (let i = fromIndex; i > 0; i--) {
      if (entries[i].value === val) return entries[i].key;
    }
    return -1;
  }

  public map(cb: (
      element: T | undefined | null,
      index: number,
      cyclicArray: CyclicArray<T>
  ) => any): CyclicArray<any> {
    let mapped = new CyclicArray<any>();
    for (let { key, value } of this.entries()) {
      mapped.push(cb(value, key, this));
    }
    return mapped;
  }

  public pop(): T | undefined | null {
    const _keys = [...this.keys()],
      lastKey = _keys[_keys.length - 1],
      popped = this[lastKey];
    
    delete this[lastKey];
    
    return popped;
  }

  public reverse(): CyclicArray<T> {
    let values = Array.from(this.values()).reverse();
    this.length = 0;
    for (let value of values) {
      this.push(value);
    }
    return this;
  }
  
  public shift() {
    if (this.length < 1) return undefined;
    const shifted = this[0];
    delete this[0];
    const a = [...this];
    this.length = 0;
    for (let aa of a) {
      this.push(aa);
    }

    return shifted;
  }

  public splice(start: number = 0, end: number = this.length): CyclicArray<T> {
    let removed = new CyclicArray<T>(),
      preserved = new CyclicArray<T>();
    
    for (let i = 0; i < this.length; i++) {
      if (i >= start && i < end) preserved.push(this[i]);
      else removed.push(this[i]);
    }
    this.length = 0;
    for (let val of preserved) {
      this.push(val);
    }
    return removed;
  }
  //TODO: Make sorting a thing.
  /* public sort(comp: (a: T, b: T) => compareFunctionReturnValue = (a, b) => { if (a < b) return -1; if (a > b) return 1; return 0;}) {
    let tmpSorted = new CyclicArray<T>();
    
  } */

  public unshift(...args: (T | undefined | null)[]) {
    const unshiftArr = [...args, ...this];

    this.length = 0;
    for (let val of unshiftArr) {
      this.push(val);
    }
    
    return this.length;
  }

  public cycleRight(count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.unshift(this.pop());
    }
  }

  public cycle(count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.push(this.shift());
    }
  }
}
