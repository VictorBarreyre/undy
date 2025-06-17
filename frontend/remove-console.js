const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

function removeConsoleLogsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse le fichier en AST
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: [
      'jsx',
      'typescript',
      'decorators-legacy',
      'dynamicImport',
      'classProperties',
      'optionalChaining',
      'nullishCoalescingOperator']

    });

    let modified = false;

    // Traverse l'AST et supprime les console.log
    traverse(ast, {
      CallExpression(path) {
        if (
        path.node.callee.type === 'MemberExpression' &&
        path.node.callee.object.name === 'console' &&
        path.node.callee.property.name === 'log')
        {
          // Si le console.log est dans une expression statement, supprime tout le statement
          if (path.parent.type === 'ExpressionStatement') {
            path.parentPath.remove();
          } else {
            // Sinon, supprime juste l'appel
            path.remove();
          }
          modified = true;
        }
      }
    });

    // Si des modifications ont été faites, écrit le nouveau fichier
    if (modified) {
      const output = generate(ast, {
        retainLines: true, // Garde la structure des lignes autant que possible
        retainFunctionParens: true,
        comments: true // Garde les commentaires
      });

      fs.writeFileSync(filePath, output.code);

    }

  } catch (error) {
    console.error(`❌ Erreur dans ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Dossiers à ignorer
          const ignoreDirs = [
          'node_modules',
          '.git',
          'android/app/build',
          'ios/build',
          'ios/Pods',
          'ios/DerivedData',
          '.expo',
          'coverage',
          'dist',
          'build'];


          const shouldIgnore = ignoreDirs.some((ignoreDir) =>
          filePath.includes(ignoreDir) || file.startsWith('.')
          );

          if (!shouldIgnore) {
            walkDir(filePath);
          }
        } else if (
        file.endsWith('.js') ||
        file.endsWith('.jsx') ||
        file.endsWith('.ts') ||
        file.endsWith('.tsx'))
        {
          removeConsoleLogsFromFile(filePath);
        }
      } catch (error) {
        console.error(`❌ Impossible d'accéder à ${filePath}:`, error.message);
      }
    });
  } catch (error) {
    console.error(`❌ Impossible de lire le dossier ${dir}:`, error.message);
  }
}

// Fonction principale
function main() {


  // Vérifier que les dépendances sont installées
  try {
    require('@babel/parser');
    require('@babel/traverse');
    require('@babel/generator');
  } catch (error) {
    console.error('❌ Les dépendances Babel ne sont pas installées !');


    process.exit(1);
  }

  // Lancer le nettoyage
  const startTime = Date.now();
  walkDir('.');

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);


}

// Lancer le script
main();