import { Tag } from 'sax';

export class XmlNode implements Tag {
  public value?: string;

  public name: string;

  public isSelfClosing: boolean;

  public attributes: Record<string, string>;

  constructor(tag: Tag) {
    this.name = tag.name;
    this.isSelfClosing = tag.isSelfClosing;
    this.attributes = tag.attributes;
  }

  toObject() {
    if (this.value && !this.isSelfClosing) {
      return this.value;
    }

    return this.attributes;
  }
}
