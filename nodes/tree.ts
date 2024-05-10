import { Tree, TreeData } from '../types';
import { XmlNode } from './node';

export class XmlNodeTree {
  public root: XmlNode;

  public children: XmlNodeTree[] = [];

  constructor(node: XmlNode) {
    this.root = node;
  }

  toObject<Type extends TreeData>(): Type {
    if (this.children.length === 0) {
      return this.root.toObject() as Type;
    }

    const childrenObject = this.children.reduce((childrenAccumulator, child) => {
      return {
        ...childrenAccumulator,
        [child.root.name]: child.toObject(),
      };
    }, {} as Tree);

    return childrenObject as Type;
  }
}
