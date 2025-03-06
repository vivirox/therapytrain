import { Project, SyntaxKind, Node, ts } from "ts-morph";
import path from "path";

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});

// Fix JSX element type issues
function fixJSXElementTypes() {
  const sourceFiles = project.getSourceFiles("src/**/*.tsx");
  let totalFixes = 0;

  sourceFiles.forEach((sourceFile) => {
    // Fix JSX.Element return types
    const functions = sourceFile.getFunctions();
    functions.forEach((func) => {
      const name = func.getName();
      if (name && /^[A-Z]/.test(name)) {
        const returnType = func.getReturnTypeNode();
        if (!returnType || returnType.getText() !== "JSX.Element") {
          func.setReturnType("JSX.Element");
          totalFixes++;
        }
      }
    });

    // Fix arrow function components
    const variables = sourceFile.getVariableDeclarations();
    variables.forEach((variable) => {
      const name = variable.getName();
      if (name && /^[A-Z]/.test(name)) {
        const initializer = variable.getInitializer();
        if (Node.isArrowFunction(initializer)) {
          const type = variable.getType();
          if (!type.isObject() || !type.getCallSignatures().length) {
            variable.setType("React.FC<any>");
            totalFixes++;
          }
        }
      }
    });

    // Fix JSX element types in render methods
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
    jsxElements.forEach((element) => {
      const tagName = element.getOpeningElement().getTagNameNode().getText();
      if (/^[A-Z]/.test(tagName)) {
        const openingElement = element.getOpeningElement();
        const props = openingElement.getAttributes();
        props.forEach((prop) => {
          if (Node.isJsxAttribute(prop)) {
            const name = prop.getNameNode().getText();
            const initializer = prop.getInitializer();
            if (initializer && Node.isJsxExpression(initializer)) {
              const expression = initializer.getExpression();
              if (expression && !expression.getType().isAny()) {
                totalFixes++;
              }
            }
          }
        });
      }
    });
  });

  console.log(`Fixed ${totalFixes} JSX element type issues`);
  project.saveSync();
}

// Fix callback parameter types
function fixCallbackTypes() {
  const sourceFiles = project.getSourceFiles("src/**/*.tsx");
  let totalFixes = 0;

  sourceFiles.forEach((sourceFile) => {
    // Fix array method callbacks
    const callExpressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    );
    callExpressions.forEach((callExpr) => {
      const propertyAccess = callExpr.getChildrenOfKind(
        SyntaxKind.PropertyAccessExpression,
      )[0];
      if (propertyAccess) {
        const methodName = propertyAccess.getName();
        if (
          ["map", "filter", "reduce", "forEach", "some", "every"].includes(
            methodName,
          )
        ) {
          const args = callExpr.getArguments();
          if (args.length > 0) {
            const callback = args[0];
            if (
              Node.isArrowFunction(callback) ||
              Node.isFunctionExpression(callback)
            ) {
              const params = callback.getParameters();
              params.forEach((param) => {
                if (!param.getTypeNode()) {
                  // Get the array element type from the caller
                  const callerType = propertyAccess.getExpression().getType();
                  if (callerType.isArray()) {
                    const elementType = callerType.getArrayElementType();
                    if (elementType) {
                      param.setType(elementType.getText());
                      totalFixes++;
                    }
                  }
                }
              });
            }
          }
        }
      }
    });

    // Fix event handler callbacks
    const jsxAttributes = sourceFile.getDescendantsOfKind(
      SyntaxKind.JsxAttribute,
    );
    jsxAttributes.forEach((attr) => {
      const name = attr.getNameNode().getText();
      if (name.startsWith("on")) {
        const initializer = attr.getInitializer();
        if (initializer && Node.isJsxExpression(initializer)) {
          const expression = initializer.getExpression();
          if (expression && Node.isArrowFunction(expression)) {
            const params = expression.getParameters();
            params.forEach((param) => {
              if (!param.getTypeNode()) {
                const eventType = name.slice(2).toLowerCase();
                switch (eventType) {
                  case "click":
                    param.setType("React.MouseEvent<HTMLElement>");
                    break;
                  case "change":
                    param.setType(
                      "React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>",
                    );
                    break;
                  case "submit":
                    param.setType("React.FormEvent<HTMLFormElement>");
                    break;
                  default:
                    param.setType("React.SyntheticEvent");
                }
                totalFixes++;
              }
            });
          }
        }
      }
    });
  });

  console.log(`Fixed ${totalFixes} callback parameter types`);
  project.saveSync();
}

// Fix component prop types
function fixPropTypes() {
  const sourceFiles = project.getSourceFiles("src/**/*.tsx");
  let totalFixes = 0;

  sourceFiles.forEach((sourceFile) => {
    // Fix component prop interfaces
    const interfaces = sourceFile.getInterfaces();
    interfaces.forEach((interfaceDecl) => {
      const name = interfaceDecl.getName();
      if (name?.endsWith("Props")) {
        // Add common prop types if missing
        const hasClassName = interfaceDecl.getProperty("className");
        if (!hasClassName) {
          interfaceDecl.addProperty({
            name: "className",
            type: "string",
            hasQuestionToken: true,
          });
          totalFixes++;
        }

        // Fix event handler prop types
        const properties = interfaceDecl.getProperties();
        properties.forEach((prop) => {
          const propName = prop.getName();
          if (propName.startsWith("on") && /[A-Z]/.test(propName[2] || "")) {
            const typeNode = prop.getTypeNode();
            if (!typeNode || typeNode.getText() === "any") {
              const eventType = propName.slice(2).toLowerCase();
              switch (eventType) {
                case "click":
                  prop.setType(
                    "(event: React.MouseEvent<HTMLElement>) => void",
                  );
                  break;
                case "change":
                  prop.setType(
                    "(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void",
                  );
                  break;
                case "submit":
                  prop.setType(
                    "(event: React.FormEvent<HTMLFormElement>) => void",
                  );
                  break;
                default:
                  prop.setType("(event: React.SyntheticEvent) => void");
              }
              totalFixes++;
            }
          }
        });
      }
    });
  });

  console.log(`Fixed ${totalFixes} component prop types`);
  project.saveSync();
}

function main() {
  console.log("Starting React type fixes...");

  fixJSXElementTypes();
  fixCallbackTypes();
  fixPropTypes();

  console.log("React type fixes completed!");
}

main();
