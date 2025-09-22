"""
ODF API Startup Script
Checks dependencies and starts the Flask API server
"""

import sys
import os
import subprocess
import importlib.util

def check_dependency(package_name, import_name=None):
    """Check if a package is installed"""
    if import_name is None:
        import_name = package_name
    
    spec = importlib.util.find_spec(import_name)
    return spec is not None

def install_requirements():
    """Install requirements if needed"""
    print("Installing requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install requirements: {e}")
        return False

def check_notebooks():
    """Check if required notebooks exist"""
    notebooks = ["LLMODF.ipynb", "innovateuk.ipynb"]
    missing = []
    
    for notebook in notebooks:
        if os.path.exists(notebook):
            print(f"✓ Found notebook: {notebook}")
        else:
            print(f"✗ Missing notebook: {notebook}")
            missing.append(notebook)
    
    return len(missing) == 0, missing

def check_chromedriver():
    """Check if ChromeDriver is available"""
    chromedriver_path = r"chromedriver-win64\chromedriver.exe"
    if os.path.exists(chromedriver_path):
        print(f"✓ Found ChromeDriver: {chromedriver_path}")
        return True
    else:
        print(f"✗ Missing ChromeDriver: {chromedriver_path}")
        print("  Please download ChromeDriver and place it in the chromedriver-win64 folder")
        return False

def main():
    """Main startup function"""
    print("="*60)
    print("ODF API Startup Check")
    print("="*60)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print(f"✗ Python 3.8+ required, found {sys.version}")
        sys.exit(1)
    else:
        print(f"✓ Python version: {sys.version}")
    
    # Check critical dependencies
    critical_deps = [
        ("flask", "flask"),
        ("pandas", "pandas"),
        ("selenium", "selenium"),
        ("jupyter", "jupyter"),
        ("groq", "groq")
    ]
    
    missing_deps = []
    for package, import_name in critical_deps:
        if check_dependency(package, import_name):
            print(f"✓ {package} is available")
        else:
            print(f"✗ {package} is missing")
            missing_deps.append(package)
    
    # Install missing dependencies
    if missing_deps:
        print(f"\nMissing dependencies: {', '.join(missing_deps)}")
        if os.path.exists("requirements.txt"):
            response = input("Install missing dependencies? (y/n): ")
            if response.lower() == 'y':
                if not install_requirements():
                    sys.exit(1)
            else:
                print("Cannot start without required dependencies")
                sys.exit(1)
        else:
            print("requirements.txt not found. Please install dependencies manually:")
            print("pip install flask flask-cors pandas selenium jupyter groq openpyxl schedule tqdm")
            sys.exit(1)
    
    # Check notebooks
    notebooks_ok, missing_notebooks = check_notebooks()
    if not notebooks_ok:
        print(f"\nWarning: Missing notebooks: {', '.join(missing_notebooks)}")
        print("The API will start but some functionality may not work")
    
    # Check ChromeDriver
    if not check_chromedriver():
        print("\nWarning: ChromeDriver not found")
        print("Web scraping functionality may not work")
    
    # Check logging config
    if os.path.exists("logging_config.py"):
        print("✓ Found logging configuration")
    else:
        print("✗ Missing logging_config.py - using basic logging")
    
    print("\n" + "="*60)
    print("Starting ODF API Server...")
    print("="*60)
    
    # Start the API
    try:
        from odf_api import app, api_manager
        print("✓ ODF API loaded successfully")
        print("\nAPI will be available at: http://localhost:5000")
        print("Press Ctrl+C to stop the server")
        print("\nStarting server...")
        
        # Start the scheduler
        api_manager.schedule_analysis()
        
        # Run the Flask app
        app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
        
    except ImportError as e:
        print(f"✗ Failed to import ODF API: {e}")
        print("Make sure all dependencies are installed")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
    except Exception as e:
        print(f"✗ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
