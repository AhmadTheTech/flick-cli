const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class FlutterValidator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  async validate() {
    const pubspecPath = path.join(this.projectRoot, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) {
      throw new Error('pubspec.yaml not found - not a Flutter project');
    }

    const mainDartPath = path.join(this.projectRoot, 'lib', 'main.dart');
    if (!fs.existsSync(mainDartPath)) {
      throw new Error('lib/main.dart not found');
    }

    const libPath = path.join(this.projectRoot, 'lib');
    if (!fs.existsSync(libPath)) {
      throw new Error('lib/ directory not found');
    }

    return true;
  }

  async getProjectData() {
    const pubspecPath = path.join(this.projectRoot, 'pubspec.yaml');
    const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
    const pubspec = yaml.parse(pubspecContent);

    const projectName = pubspec.name || 'Unknown Project';
    const files = this.scanDartFiles(path.join(this.projectRoot, 'lib'));
    const dependencies = this.extractDependencies(pubspec);

    return {
      name: projectName,
      version: pubspec.version || '1.0.0',
      description: pubspec.description || '',
      files,
      dependencies,
      pubspec: pubspecContent,
      entryPoint: 'lib/main.dart',
      timestamp: Date.now()
    };
  }

  scanDartFiles(dir, files = {}) {
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        this.scanDartFiles(fullPath, files);
      } else if (item.endsWith('.dart')) {
        const relativePath = path.relative(this.projectRoot, fullPath);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          files[relativePath] = content;
        } catch (error) {
          console.warn(`Warning: Could not read ${relativePath}`);
        }
      }
    });

    return files;
  }

  extractDependencies(pubspec) {
    const deps = {};
    
    if (pubspec.dependencies) {
      for (const [name, version] of Object.entries(pubspec.dependencies)) {
        if (name !== 'flutter') {
          deps[name] = typeof version === 'string' ? version : version.version || 'latest';
        }
      }
    }

    return deps;
  }
}

module.exports = FlutterValidator;