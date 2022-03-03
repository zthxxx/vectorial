interface JsonSerializableStatic {
  fromJson(json: string): JsonSerializable;
}

interface JsonSerializable {
  toJson: () => string;
}

interface A extends JsonSerializableStatic{ }
class A implements JsonSerializable {

  constructor(readonly id: number, readonly name: string) { }
  toJson() { return JSON.stringify(this); }

  fromJson(json: string): A {
    const obj = JSON.parse(json);
    return new A(obj.id, obj.name);
  }
}

const a = new A(1, 'Charlize');

const json = a.toJson();

const y = A.fromJson(json);
console.info(a, json, y);
console.info(new a.constructor(1, 'Theron'));
const m = new A.prototype.constructor(1, 'Charlize Theron');
console.info(m);
