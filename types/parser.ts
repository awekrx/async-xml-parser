import { SaxesTagPlain } from 'saxes';

export type Tree = {
  [key in string]: string | Tree;
};

export type TreeData = string | Tree;

export type OnOpenTag = {
  type: 'opentag';
  tag: SaxesTagPlain;
};

export type OnCloseTag = {
  type: 'closetag';
  tag: SaxesTagPlain;
};

export type OnText = {
  type: 'text';
  text: string;
};

export type OnError = {
  type: 'error';
  error: Error;
};

export type OnEnd = {
  type: 'end';
};

export type ParserEvents = OnOpenTag | OnCloseTag | OnText | OnError | OnEnd;
