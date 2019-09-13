import { visit } from 'graphql';
import { flatten, lookForNested, intersect } from './utils';

export interface Criteria {
  parent?: Criteria;
  [key: string]: any;
}

export type Comparator = any | ((value: any) => boolean);

export default class FlatMap {
  private nodes: any[] = [];

  public constructor(astNode) {
    this.flattenAST(astNode);
  }

  private flattenAST(astNode) {
    visit(astNode, {
      enter: (node, key, parent, path, ancestors) => {
        this.nodes.push({
          ...node,
          id: flatten(path)
        });
      }
    });
  }

  public getNodesBy(selector, comparator: Comparator) {
    return this.nodes.filter((node) =>
      lookForNested(node, selector, comparator)
    );
  }

  public getNodesByCriteria(criteria: Criteria) {
    let nodes = [];
    for (const key in criteria) {
      const temp = this.getNodesBy(key, criteria[key]);
      if (nodes.length && temp.length) {
        nodes = intersect(nodes, temp);
      } else {
        nodes = temp;
      }
    }
    return nodes;
  }

  public getNodeBy(selector: string, comparator: Comparator) {
    return this.nodes.find((node) => lookForNested(node, selector, comparator));
  }
  public getNodeByCriteria(criteria: Criteria) {
    return this.nodes.find((node) =>
      Object.entries(criteria).every((row) =>
        lookForNested(node, row[0], row[1])
      )
    );
  }
}

export const getDependingNodes = (parentId: string) => {
  return (id) => {
    const smallest = parentId.split(',');
    const longest = id.split(',');

    return smallest.every((row, index) => row === longest[index]);
  };
};

export const getParentNodeByID = (parentId: string) => {
  return (id) => {
    const smallest = id.split(',');
    const longest = parentId.split(',');

    return smallest.every((row, index) => row === longest[index]);
  };
};
