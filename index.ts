import { createReadStream, ReadStream } from 'fs';
import path from 'path';
import { SaxesParser, SaxesTagPlain } from 'saxes';

import { XmlNode, XmlNodeTree } from './nodes';
import { ParserEvents, TreeData } from './types';

export class XmlParser<
  RecordType extends TreeData,
  Response extends Record<TagName, RecordType[]>,
  TagName extends string,
> {
  private currentNode: XmlNode | undefined;

  private currentNodeTree: XmlNodeTree | undefined;

  private lastNestedTrees: XmlNodeTree[] = [];

  private nodes: Response;

  private stream: ReadStream;

  private parser: SaxesParser;

  private events: ParserEvents[] = [];

  constructor(
    private readonly filePath: string,
    private readonly tags: readonly TagName[]
  ) {
    this.nodes = Object.fromEntries<unknown[]>(
      tags.map((tag) => {
        return [tag, []];
      })
    ) as Response;

    this.stream = createReadStream(path.join(process.cwd(), this.filePath), {
      highWaterMark: 1024,
      encoding: 'utf8',
    });
    this.parser = new SaxesParser();
  }

  private async *parseChunk(): AsyncGenerator<ParserEvents[], void, undefined> {
    this.parser.on('error', (error) => {
      this.events.push({
        type: 'error',
        error,
      });
    });

    this.parser.on('opentag', (tag) => {
      this.events.push({
        type: 'opentag',
        tag,
      });
    });

    this.parser.on('text', (text) => {
      this.events.push({
        type: 'text',
        text,
      });
    });

    this.parser.on('closetag', (tag) => {
      this.events.push({
        type: 'closetag',
        tag,
      });
    });

    for await (const chunk of this.stream ?? []) {
      this.parser.write(chunk as string);

      yield this.events;
      this.events = [];
    }

    yield [
      {
        type: 'end',
      },
    ];
  }

  private onOpenTag(tag: SaxesTagPlain) {
    if (this.currentNode && this.currentNodeTree && !this.tags?.includes(this.currentNode.name as TagName)) {
      this.lastNestedTrees.push(new XmlNodeTree(this.currentNode));
    }

    this.currentNode = new XmlNode(tag);

    if (this.tags?.includes(tag.name as TagName)) {
      this.currentNodeTree = new XmlNodeTree(this.currentNode);
    }
  }

  private onText(text: string) {
    const trimmedText = text.trim();

    if (!this.currentNode || trimmedText.length === 0) {
      return;
    }

    this.currentNode.value = trimmedText;
  }

  private async onCloseTag(tag: SaxesTagPlain, callback?: (data: RecordType) => Promise<void> | void) {
    if (this.currentNodeTree?.root.name === tag.name) {
      if (callback) {
        callback(this.currentNodeTree.toObject());
      } else {
        this.nodes[this.currentNodeTree.root.name as TagName].push(this.currentNodeTree.toObject<RecordType>());
      }

      this.currentNode = undefined;
      this.currentNodeTree = undefined;

      return;
    }

    if (!this.currentNodeTree) {
      return;
    }

    const lastNode = this.lastNestedTrees.at(-1);

    if (lastNode?.root.name === tag.name) {
      this.lastNestedTrees.pop();
      this.currentNode = undefined;

      if (this.lastNestedTrees.length === 0) {
        this.currentNodeTree.children.push(lastNode);

        return;
      }

      this.lastNestedTrees.at(-1)?.children.push(lastNode);

      return;
    }

    if (!this.currentNode) {
      return;
    }

    const childNode = new XmlNodeTree(this.currentNode);
    this.currentNode = undefined;

    if (this.lastNestedTrees.length === 0) {
      this.currentNodeTree.children.push(childNode);

      return;
    }

    lastNode?.children.push(childNode);
  }

  async get(): Promise<Response> {
    for await (const events of this.parseChunk()) {
      for (const event of events ?? []) {
        if (event.type === 'opentag') {
          this.onOpenTag(event.tag);
        }

        if (event.type === 'text') {
          this.onText(event.text);
        }

        if (event.type === 'closetag') {
          this.onCloseTag(event.tag);
        }

        if (event.type === 'error') {
          throw event.error;
        }

        if (event.type === 'end') {
          return this.nodes;
        }
      }
    }

    return this.nodes;
  }

  async parse(callback?: (data: RecordType) => Promise<void> | void) {
    for await (const events of this.parseChunk()) {
      for (const event of events ?? []) {
        if (event.type === 'opentag') {
          this.onOpenTag(event.tag);
        }

        if (event.type === 'text') {
          this.onText(event.text);
        }

        if (event.type === 'closetag') {
          this.onCloseTag(event.tag, callback);
        }

        if (event.type === 'error') {
          throw event.error;
        }

        if (event.type === 'end') {
          return;
        }
      }
    }
  }
}
