// Copiez ce script dans un fichier temporaire dans votre projet

const fs = require('fs');
const path = require('path');

// Configurations
const SEARCH_DIR = './'; // Répertoire racine du projet
const NATIVE_BASE_COMPONENTS = [
  'Box', 'Text', 'Heading', 'VStack', 'HStack', 'Center', 'useTheme', 
  'useColorMode', 'useColorModeValue', 'useBreakpointValue', 'useContrastText',
  'useDisclose', 'useToast'
];

// Patterns à rechercher dans les fichiers
const IMPORT_PATTERNS = [
  // Import directs de native-base
  /import\s+.*\{\s*([^}]*)\s*\}\s*from\s+['"]native-base['"]/g,
  // Import directs de useTheme
  /import\s+.*\{\s*([^}]*useTheme[^}]*)\s*\}\s*from/g,
  // Import avec alias
  /import\s+.*\{\s*([^}]*as[^}]*)\s*\}\s*from\s+['"]native-base['"]/g,
  // Import de Box directement
  /import\s+Box\s+from/g
];

// Extensions de fichiers à scanner
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Dossiers à ignorer
const IGNORE_DIRS = ['node_modules', '.git', 'build', 'dist', 'android', 'ios'];

// Fonction pour vérifier si un fichier contient des imports NativeBase
function checkFileForNativeBaseImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let suspiciousImports = [];

    // Vérifier les patterns d'import
    for (const pattern of IMPORT_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        // Pour chaque match, vérifier si un composant NativeBase est importé
        for (const match of matches) {
          if (NATIVE_BASE_COMPONENTS.some(comp => match.includes(comp))) {
            suspiciousImports.push({
              pattern: match.trim(),
              components: NATIVE_BASE_COMPONENTS.filter(comp => match.includes(comp))
            });
          }
        }
      }
    }

    // Vérifier des utilisations spécifiques (comme useTheme ou Box)
    if (content.includes('useTheme(')) {
      suspiciousImports.push({
        pattern: 'useTheme() call detected',
        components: ['useTheme']
      });
    }

    if (content.includes('<Box') || content.includes('Box ')) {
      suspiciousImports.push({
        pattern: '<Box> component used',
        components: ['Box']
      });
    }

    return suspiciousImports.length > 0 ? suspiciousImports : null;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Fonction récursive pour parcourir les répertoires
function scanDirectory(directory) {
  let results = [];
  
  try {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const itemPath = path.join(directory, item);
      
      // Ignorer les dossiers spécifiés
      if (IGNORE_DIRS.includes(item)) continue;
      
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Récursion dans les sous-dossiers
        results = results.concat(scanDirectory(itemPath));
      } else if (stats.isFile() && FILE_EXTENSIONS.includes(path.extname(itemPath))) {
        // Vérifier les fichiers avec les extensions spécifiées
        const imports = checkFileForNativeBaseImports(itemPath);
        if (imports) {
          results.push({
            file: itemPath,
            imports
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error.message);
  }
  
  return results;
}

// Exécution principale
console.log('Scanning project for NativeBase imports...');
const suspiciousFiles = scanDirectory(SEARCH_DIR);

console.log('\n==== SUSPICIOUS FILES ====\n');
if (suspiciousFiles.length === 0) {
  console.log('No suspicious NativeBase imports found.');
} else {
  console.log(`Found ${suspiciousFiles.length} files with potential NativeBase issues:\n`);
  
  suspiciousFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.file}`);
    file.imports.forEach(imp => {
      console.log(`   - ${imp.pattern}`);
      console.log(`     Components: ${imp.components.join(', ')}`);
    });
    console.log('');
  });
  
  console.log('\nPriority check these files:');
  const priorityFiles = suspiciousFiles.filter(file => 
    file.file.includes('Notification') || 
    file.file.includes('DeepLink') || 
    file.file.includes('Context') ||
    file.file.includes('Provider') ||
    file.file.includes('App.js')
  );
  
  priorityFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.file}`);
  });
}