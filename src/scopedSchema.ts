import {
  visit,
  parse,
  buildASTSchema,
  printSchema,
  Kind,
  GraphQLSchema
} from 'graphql';
import { flatten } from './utils';
import FlatMap, { getDependingNodes, getParentNodeByID, Criteria } from './flatMap';



class RemovableMarker {
  private removableNodes: any[] = [];
  public constructor(private flatMap: FlatMap) {}

  public markNode(node) {
    this.removableNodes.push(node.id);
    if (this[node.kind]) {
      this[node.kind](node);
    }
  }

  public isNodePathRemovable(path) {
    return this.removableNodes.includes(flatten(path));
  }

  private [Kind.OBJECT_TYPE_DEFINITION](node) {
    const namedTypeNodes = this.flatMap.getNodesByCriteria({
      kind: Kind.NAMED_TYPE,
      'name.value': node.name.value
    });

    namedTypeNodes.forEach((namedTypeNode) => {
      this.markNode(namedTypeNode);
    });
  }

  private [Kind.NAMED_TYPE](node) {
    const fieldDefinitionNodes = this.flatMap.getNodesByCriteria({
      kind: Kind.FIELD_DEFINITION,
      id: getParentNodeByID(node.id)
    });

    fieldDefinitionNodes.forEach((fieldDefinitionNode) => {
      this.markNode(fieldDefinitionNode);
    });
  }

  private [Kind.FIELD_DEFINITION](node) {
    const objectTypeDefinitionNode = this.flatMap.getNodeByCriteria({
      kind: Kind.OBJECT_TYPE_DEFINITION,
      id: getParentNodeByID(node.id)
    });

    const objectTypeDefinitionChildrenNodes = this.flatMap.getNodesByCriteria({
      kind: Kind.FIELD_DEFINITION,
      id: getDependingNodes(objectTypeDefinitionNode.id)
    });

    const remainingFields = objectTypeDefinitionChildrenNodes.filter(
      (objectTypeDefinitionChildrenNode) =>
        !this.removableNodes.includes(objectTypeDefinitionChildrenNode.id)
    );

    if (remainingFields.length === 0) {
      this.markNode(objectTypeDefinitionNode);
    }
  }

  private [Kind.INPUT_OBJECT_TYPE_DEFINITION](node) {
    const namedTypeNodes = this.flatMap.getNodesByCriteria({
      kind: Kind.NAMED_TYPE,
      'name.value': node.name.value
    });

    namedTypeNodes.forEach((namedTypeNode) => {
      this.markNode(namedTypeNode);
    });
  }
}

export default (schema: GraphQLSchema, selectors: Criteria[]) => {
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);

  const flatMap = new FlatMap(astNode);

  const removableMarker = new RemovableMarker(flatMap);

  selectors.forEach((criteria) => {
    let node;
    if (criteria.parent) {
      const { parent, ...newCriteria } = criteria;

      const nodes = flatMap.getNodesByCriteria(newCriteria);
      const parentNode = flatMap.getNodeByCriteria(parent);
      node = nodes.find((node) => {
        const smallest = parentNode.id.split(',');
        const longest = node.id.split(',');
        return smallest.every((row, index) => row === longest[index]);
      });
    } else {
      node = flatMap.getNodeByCriteria(criteria);
    }

    removableMarker.markNode(node);
  });

  const scopedAST = visit(astNode, {
    leave(node, key, parent, path, ancestors) {
      return removableMarker.isNodePathRemovable(path) ? null : undefined;
    }
  });
  return buildASTSchema(scopedAST);
};
