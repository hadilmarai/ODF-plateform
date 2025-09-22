#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 ODF API Setup Script');
console.log('========================\n');

// Check if .env file exists
const checkEnvFile = () => {
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            console.log('📝 Creating .env file from .env.example...');
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ .env file created');
            console.log('⚠️  Please edit .env file with your database credentials\n');
        } else {
            console.log('❌ .env.example file not found');
            return false;
        }
    } else {
        console.log('✅ .env file already exists\n');
    }
    return true;
};

// Check if required directories exist
const checkDirectories = () => {
    console.log('📁 Checking required directories...');
    
    const requiredDirs = [
        '../data',
        '../logs',
        'uploads'
    ];
    
    requiredDirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            console.log(`📁 Creating directory: ${dir}`);
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
    
    console.log('✅ Directories checked\n');
};

// Check if required files exist
const checkRequiredFiles = () => {
    console.log('📄 Checking required files...');
    
    const requiredFiles = [
        '../LLMODF.ipynb',
        '../innovateuk.ipynb'
    ];
    
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ Found: ${file}`);
        } else {
            console.log(`❌ Missing: ${file}`);
            allFilesExist = false;
        }
    });
    
    if (!allFilesExist) {
        console.log('\n⚠️  Some required notebook files are missing.');
        console.log('Please ensure LLMODF.ipynb and innovateuk.ipynb are in the parent directory.\n');
    } else {
        console.log('✅ All required files found\n');
    }
    
    return allFilesExist;
};

// Check Node.js and npm versions
const checkVersions = () => {
    console.log('🔍 Checking system requirements...');
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 16) {
        console.log(`✅ Node.js version: ${nodeVersion}`);
    } else {
        console.log(`❌ Node.js version ${nodeVersion} is too old. Please upgrade to v16 or higher.`);
        return false;
    }
    
    return true;
};

// Install dependencies
const installDependencies = () => {
    return new Promise((resolve, reject) => {
        console.log('📦 Installing dependencies...');
        
        const npmProcess = spawn('npm', ['install'], {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        npmProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Dependencies installed successfully\n');
                resolve();
            } else {
                console.log('❌ Failed to install dependencies\n');
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
        
        npmProcess.on('error', (error) => {
            console.log('❌ Error running npm install:', error.message);
            reject(error);
        });
    });
};

// Check Python and Jupyter
const checkPython = () => {
    return new Promise((resolve) => {
        console.log('🐍 Checking Python and Jupyter...');
        
        const pythonProcess = spawn('python', ['--version'], {
            stdio: 'pipe'
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Python is available');
                
                // Check Jupyter
                const jupyterProcess = spawn('jupyter', ['--version'], {
                    stdio: 'pipe'
                });
                
                jupyterProcess.on('close', (jupyterCode) => {
                    if (jupyterCode === 0) {
                        console.log('✅ Jupyter is available\n');
                        resolve(true);
                    } else {
                        console.log('❌ Jupyter is not available. Please install Jupyter.\n');
                        resolve(false);
                    }
                });
                
                jupyterProcess.on('error', () => {
                    console.log('❌ Jupyter is not available. Please install Jupyter.\n');
                    resolve(false);
                });
            } else {
                console.log('❌ Python is not available. Please install Python.\n');
                resolve(false);
            }
        });
        
        pythonProcess.on('error', () => {
            console.log('❌ Python is not available. Please install Python.\n');
            resolve(false);
        });
    });
};

// Main setup function
const runSetup = async () => {
    try {
        console.log('Starting ODF API setup...\n');
        
        // Check system requirements
        if (!checkVersions()) {
            process.exit(1);
        }
        
        // Check and create .env file
        if (!checkEnvFile()) {
            process.exit(1);
        }
        
        // Check directories
        checkDirectories();
        
        // Check required files
        checkRequiredFiles();
        
        // Install dependencies
        await installDependencies();
        
        // Check Python and Jupyter
        const pythonAvailable = await checkPython();
        
        console.log('🎉 Setup completed!\n');
        console.log('Next steps:');
        console.log('1. Edit .env file with your database credentials');
        console.log('2. Ensure MySQL database is running');
        
        if (!pythonAvailable) {
            console.log('3. Install Python and Jupyter for notebook execution');
        }
        
        console.log('4. Run: npm start\n');
        console.log('📚 For more information, see README.md');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
};

// Run setup if this script is executed directly
if (require.main === module) {
    runSetup();
}

module.exports = { runSetup };
