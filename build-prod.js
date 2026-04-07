import { build } from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function prepareDeployment() {
  console.log('🚀 Starting GoDaddy Deployment Preparation...');

  // 1. Build Frontend
  console.log('📦 Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Transpile Backend
  console.log('⚙️ Transpiling backend server...');
  await build({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'server-prod.js',
    format: 'esm',
    external: ['express', 'vite', 'dotenv', '@google/genai'],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  });

  // 3. Create Deploy Folder
  const deployDir = 'godaddy-deploy';
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }
  fs.mkdirSync(deployDir);

  // 4. Copy Files
  console.log('📂 Copying files to deploy folder...');
  
  // Copy dist (frontend)
  fs.cpSync('dist', path.join(deployDir, 'dist'), { recursive: true });
  
  // Copy transpiled server
  fs.copyFileSync('server-prod.js', path.join(deployDir, 'server.js'));
  
  // Copy database and schema
  if (fs.existsSync('quotations.db')) {
    fs.copyFileSync('quotations.db', path.join(deployDir, 'quotations.db'));
  }
  fs.copyFileSync('src/db.ts', path.join(deployDir, 'src/db.ts'));
  
  // Copy package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  // Simplify package.json for production
  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    type: 'module',
    main: 'server.js',
    scripts: {
      start: 'node server.js'
    },
    dependencies: pkg.dependencies
  };
  fs.writeFileSync(path.join(deployDir, 'package.json'), JSON.stringify(prodPkg, null, 2));

  console.log('\n✅ Deployment folder "godaddy-deploy" is ready!');
  console.log('\n--- NEXT STEPS FOR GODADDY ---');
  console.log('1. Download the contents of the "godaddy-deploy" folder.');
  console.log('2. Zip the contents of "godaddy-deploy".');
  console.log('3. Upload the zip to your GoDaddy cPanel File Manager.');
  console.log('4. Extract the zip in your application root.');
  console.log('5. In cPanel "Setup Node.js App":');
  console.log('   - Application startup file: server.js');
  console.log('   - Run "npm install"');
  console.log('   - Add GEMINI_API_KEY to Environment Variables');
}

prepareDeployment().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
