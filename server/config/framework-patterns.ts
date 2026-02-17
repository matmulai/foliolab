// File patterns for different project types and frameworks
export interface FrameworkPattern {
  files: string[];
  dependencies?: string[];
  configs?: string[];
  patterns: string[];
}

export const FRAMEWORK_PATTERNS: Record<string, FrameworkPattern> = {
  'React': {
    files: ['package.json'],
    dependencies: ['react', '@types/react', 'react-dom'],
    configs: ['vite.config.js', 'webpack.config.js', 'craco.config.js'],
    patterns: ['src/App.jsx', 'src/App.tsx', 'public/index.html']
  },
  'Next.js': {
    files: ['package.json', 'next.config.js', 'next.config.mjs'],
    dependencies: ['next'],
    patterns: ['pages/', 'app/', 'src/pages/', 'src/app/']
  },
  'Vue.js': {
    files: ['package.json'],
    dependencies: ['vue', '@vue/cli'],
    configs: ['vue.config.js', 'vite.config.js'],
    patterns: ['src/App.vue', 'src/main.js']
  },
  'Angular': {
    files: ['package.json', 'angular.json'],
    dependencies: ['@angular/core', '@angular/cli'],
    patterns: ['src/app/', 'src/main.ts']
  },
  'Express.js': {
    files: ['package.json'],
    dependencies: ['express'],
    patterns: ['server.js', 'app.js', 'index.js', 'src/server.js']
  },
  'Django': {
    files: ['requirements.txt', 'manage.py', 'pyproject.toml'],
    dependencies: ['django'],
    patterns: ['settings.py', 'urls.py', 'wsgi.py']
  },
  'Flask': {
    files: ['requirements.txt', 'app.py'],
    dependencies: ['flask'],
    patterns: ['app.py', 'main.py', 'run.py']
  },
  'Spring Boot': {
    files: ['pom.xml', 'build.gradle'],
    dependencies: ['spring-boot'],
    patterns: ['src/main/java/', 'Application.java']
  },
  'Ruby on Rails': {
    files: ['Gemfile', 'config/application.rb'],
    dependencies: ['rails'],
    patterns: ['app/', 'config/', 'db/']
  },
  'Laravel': {
    files: ['composer.json', 'artisan'],
    dependencies: ['laravel/framework'],
    patterns: ['app/', 'routes/', 'resources/']
  },
  'Rust': {
    files: ['Cargo.toml'],
    patterns: ['src/main.rs', 'src/lib.rs']
  },
  'Go': {
    files: ['go.mod', 'go.sum'],
    patterns: ['main.go', 'cmd/', 'internal/']
  },
  'Python': {
    files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    patterns: ['main.py', 'app.py', '__init__.py']
  },
  'Mobile App (React Native)': {
    files: ['package.json'],
    dependencies: ['react-native', '@react-native'],
    configs: ['metro.config.js', 'react-native.config.js'],
    patterns: ['App.js', 'App.tsx', 'index.js']
  },
  'Mobile App (Flutter)': {
    files: ['pubspec.yaml'],
    patterns: ['lib/main.dart', 'android/', 'ios/']
  },
  'Desktop App (Electron)': {
    files: ['package.json'],
    dependencies: ['electron'],
    patterns: ['main.js', 'src/main/', 'public/electron.js']
  }
};
