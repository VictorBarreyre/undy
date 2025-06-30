const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// Compteurs pour les statistiques
let filesProcessed = 0;
let consolesRemoved = 0;
let filesModified = 0;

function removeConsoleLogsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip si le fichier est vide
    if (!content.trim()) return;

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
        'nullishCoalescingOperator',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'functionBind',
        'functionSent',
        'numericSeparator',
        'optionalCatchBinding',
        'throwExpressions',
        'classPrivateProperties',
        'classPrivateMethods',
        'importMeta',
        'bigInt',
        'topLevelAwait',
        'importAssertions'
      ]
    });

    let modified = false;
    let fileConsoleCount = 0;

    // Traverse l'AST et supprime les console.log, console.warn, console.error, etc.
    traverse(ast, {
      CallExpression(path) {
        if (
          path.node.callee.type === 'MemberExpression' &&
          path.node.callee.object.name === 'console'
        ) {
          const methodName = path.node.callee.property.name;
          // Supprime tous les types de console
          if (['log', 'warn', 'error', 'info', 'debug', 'trace', 'table', 'group', 'groupEnd'].includes(methodName)) {
            fileConsoleCount++;
            
            // Si le console est dans une expression statement, supprime tout le statement
            if (path.parent.type === 'ExpressionStatement') {
              path.parentPath.remove();
            } else if (path.parent.type === 'ConditionalExpression') {
              // Pour les expressions ternaires, remplace par undefined
              path.replaceWith(parser.parseExpression('undefined'));
            } else if (path.parent.type === 'LogicalExpression') {
              // Pour les expressions logiques (&&, ||), remplace par undefined
              path.replaceWith(parser.parseExpression('undefined'));
            } else {
              // Pour les autres cas, essaie de supprimer ou remplace par undefined
              try {
                path.remove();
              } catch (e) {
                path.replaceWith(parser.parseExpression('undefined'));
              }
            }
            modified = true;
          }
        }
      }
    });

    // Si des modifications ont été faites, écrit le nouveau fichier
    if (modified) {
      const output = generate(ast, {
        retainLines: true,
        retainFunctionParens: true,
        comments: true,
        compact: false
      });

      fs.writeFileSync(filePath, output.code);
      console.log(`✅ ${filePath} - Supprimé ${fileConsoleCount} console(s)`);
      filesModified++;
      consolesRemoved += fileConsoleCount;
    }
    
    filesProcessed++;

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
            'build',
            'vendor',
            '.next',
            '.nuxt',
            'out',
            '__tests__',
            '__mocks__'
          ];

          const shouldIgnore = ignoreDirs.some((ignoreDir) =>
            filePath.includes(ignoreDir) || file.startsWith('.')
          );

          if (!shouldIgnore) {
            walkDir(filePath);
          }
        } else if (
          (file.endsWith('.js') ||
           file.endsWith('.jsx') ||
           file.endsWith('.ts') ||
           file.endsWith('.tsx')) &&
          !file.includes('.bundle.') &&
          !file.includes('bundle.js') &&
          !file.includes('.min.') &&
          !file.includes('-min.') &&
          !file.includes('.chunk.') &&
          !file.includes('.test.') &&
          !file.includes('.spec.')
        ) {
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
  console.log('🧹 Suppression des console.log dans votre projet...\n');

  // Vérifier que les dépendances sont installées
  try {
    require('@babel/parser');
    require('@babel/traverse');
    require('@babel/generator');
  } catch (error) {
    console.error('❌ Les dépendances Babel ne sont pas installées !');
    console.log('\nInstallez-les avec :');
    console.log('npm install --save-dev @babel/parser @babel/traverse @babel/generator\n');
    process.exit(1);
  }

  // Lancer le nettoyage
  const startTime = Date.now();
  
  // Dossiers spécifiques à votre projet
  const dirsToClean = [
    './src',
    './components',  // Au cas où il y aurait des composants à la racine
    './screens',     // Au cas où il y aurait des screens à la racine
  ];
  
  console.log('📁 Dossiers à nettoyer:');
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`   - ${dir}`);
    }
  });
  console.log('');
  
  // Nettoyer chaque dossier
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      walkDir(dir);
    }
  });

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Résumé:');
  console.log(`   - Fichiers analysés: ${filesProcessed}`);
  console.log(`   - Fichiers modifiés: ${filesModified}`);
  console.log(`   - Console supprimés: ${consolesRemoved}`);
  console.log(`   - Durée: ${duration}s`);
  console.log('\n✨ Nettoyage terminé!');
}

// Lancer le script
if (require.main === module) {
  main();
}

module.exports = { removeConsoleLogsFromFile, walkDir };