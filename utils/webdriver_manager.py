"""
WebDriver Manager Utility
Automatically manages ChromeDriver installation and version compatibility
"""

import os
import sys
import requests
import zipfile
import platform
import subprocess
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
import logging

logger = logging.getLogger(__name__)

class WebDriverManager:
    def __init__(self, download_dir="webdrivers", browser_preference="auto"):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(exist_ok=True)
        self.system = platform.system().lower()
        self.browser_preference = browser_preference  # "chrome", "edge", or "auto"
        self.detected_browser = None
        self.detected_version = None
        
    def get_edge_version(self):
        """Get the installed Microsoft Edge browser version"""
        try:
            if self.system == "windows":
                # Try multiple possible Edge paths on Windows
                edge_paths = [
                    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                ]

                for edge_path in edge_paths:
                    if os.path.exists(edge_path):
                        result = subprocess.run([edge_path, "--version"],
                                              capture_output=True, text=True, timeout=10)
                        if result.returncode == 0:
                            # Extract version number using regex
                            import re
                            version_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', result.stdout)
                            if version_match:
                                return version_match.group(1)

                # Alternative method using registry
                try:
                    import winreg
                    # Try multiple registry locations for Edge
                    registry_paths = [
                        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Edge\BLBeacon"),
                        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Edge\BLBeacon"),
                        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Edge\BLBeacon"),
                    ]

                    for hkey, path in registry_paths:
                        try:
                            key = winreg.OpenKey(hkey, path)
                            version, _ = winreg.QueryValueEx(key, "version")
                            winreg.CloseKey(key)
                            if version and re.match(r'\d+\.\d+\.\d+\.\d+', version):
                                return version
                        except:
                            continue
                except:
                    pass

            elif self.system == "linux":
                result = subprocess.run(["microsoft-edge", "--version"],
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    import re
                    version_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', result.stdout)
                    if version_match:
                        return version_match.group(1)

            elif self.system == "darwin":  # macOS
                result = subprocess.run(["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "--version"],
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    import re
                    version_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', result.stdout)
                    if version_match:
                        return version_match.group(1)

        except Exception as e:
            logger.warning(f"Could not detect Edge version: {e}")

        return None

    def get_chrome_version(self):
        """Get the installed Chrome browser version"""
        try:
            if self.system == "windows":
                # Try multiple possible Chrome paths on Windows
                chrome_paths = [
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                    r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe".format(os.getenv('USERNAME'))
                ]

                for chrome_path in chrome_paths:
                    if os.path.exists(chrome_path):
                        result = subprocess.run([chrome_path, "--version"],
                                              capture_output=True, text=True, timeout=10)
                        if result.returncode == 0:
                            # Extract version number using regex
                            import re
                            version_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', result.stdout)
                            if version_match:
                                return version_match.group(1)

                # Alternative method using registry
                try:
                    import winreg
                    # Try multiple registry locations
                    registry_paths = [
                        (winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\BLBeacon"),
                        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Google\Chrome\BLBeacon"),
                        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Google\Chrome\BLBeacon"),
                    ]

                    for hkey, path in registry_paths:
                        try:
                            key = winreg.OpenKey(hkey, path)
                            version, _ = winreg.QueryValueEx(key, "version")
                            winreg.CloseKey(key)
                            if version and re.match(r'\d+\.\d+\.\d+\.\d+', version):
                                return version
                        except:
                            continue
                except:
                    pass

            elif self.system == "linux":
                result = subprocess.run(["google-chrome", "--version"],
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    import re
                    version_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', result.stdout)
                    if version_match:
                        return version_match.group(1)

            elif self.system == "darwin":  # macOS
                result = subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--version"],
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    import re
                    version_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', result.stdout)
                    if version_match:
                        return version_match.group(1)

        except Exception as e:
            logger.warning(f"Could not detect Chrome version: {e}")

        # Fallback: try to get version from file properties (Windows only)
        if self.system == "windows":
            try:
                import win32api
                chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
                if os.path.exists(chrome_path):
                    info = win32api.GetFileVersionInfo(chrome_path, "\\")
                    ms = info['FileVersionMS']
                    ls = info['FileVersionLS']
                    version = f"{win32api.HIWORD(ms)}.{win32api.LOWORD(ms)}.{win32api.HIWORD(ls)}.{win32api.LOWORD(ls)}"
                    return version
            except ImportError:
                logger.warning("win32api not available for version detection")
            except Exception as e:
                logger.warning(f"File version detection failed: {e}")

        return None

    def detect_browser(self):
        """Detect the best available browser and its version"""
        browsers_to_try = []

        if self.browser_preference == "chrome":
            browsers_to_try = ["chrome"]
        elif self.browser_preference == "edge":
            browsers_to_try = ["edge"]
        else:  # auto detection
            browsers_to_try = ["chrome", "edge"]

        for browser in browsers_to_try:
            if browser == "chrome":
                version = self.get_chrome_version()
                if version:
                    self.detected_browser = "chrome"
                    self.detected_version = version
                    logger.info(f"Detected Chrome browser version: {version}")
                    return "chrome", version
            elif browser == "edge":
                version = self.get_edge_version()
                if version:
                    self.detected_browser = "edge"
                    self.detected_version = version
                    logger.info(f"Detected Edge browser version: {version}")
                    return "edge", version

        return None, None

    def get_compatible_chromedriver_version(self, chrome_version):
        """Get compatible ChromeDriver version for the given Chrome version"""
        try:
            major_version = chrome_version.split('.')[0]
            
            # ChromeDriver version mapping API
            url = f"https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                versions = data.get('versions', [])
                
                # Find the latest compatible version
                compatible_versions = [
                    v for v in versions 
                    if v['version'].startswith(major_version + '.')
                ]
                
                if compatible_versions:
                    # Sort by version and get the latest
                    compatible_versions.sort(key=lambda x: [int(i) for i in x['version'].split('.')], reverse=True)
                    return compatible_versions[0]['version']
            
            # Fallback: use the major version
            return f"{major_version}.0.0.0"
            
        except Exception as e:
            logger.error(f"Error getting compatible ChromeDriver version: {e}")
            return None
    
    def download_edgedriver(self, version):
        """Download EdgeDriver for the specified version"""
        try:
            # Determine platform-specific download URL
            if self.system == "windows":
                platform_name = "win64"
                executable_name = "msedgedriver.exe"
            elif self.system == "linux":
                platform_name = "linux64"
                executable_name = "msedgedriver"
            elif self.system == "darwin":
                platform_name = "mac64"
                executable_name = "msedgedriver"
            else:
                raise Exception(f"Unsupported platform: {self.system}")

            # Download URL for EdgeDriver
            download_url = f"https://msedgedriver.azureedge.net/{version}/edgedriver_{platform_name}.zip"

            logger.info(f"Downloading EdgeDriver {version} from {download_url}")

            response = requests.get(download_url, timeout=300)
            response.raise_for_status()

            # Save and extract
            zip_path = self.download_dir / f"edgedriver-{version}.zip"
            with open(zip_path, 'wb') as f:
                f.write(response.content)

            # Extract
            extract_dir = self.download_dir / f"edgedriver-{version}"
            extract_dir.mkdir(exist_ok=True)

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)

            # Find the executable
            edgedriver_path = None
            for root, dirs, files in os.walk(extract_dir):
                if executable_name in files:
                    edgedriver_path = Path(root) / executable_name
                    break

            if edgedriver_path and edgedriver_path.exists():
                # Make executable on Unix systems
                if self.system in ["linux", "darwin"]:
                    os.chmod(edgedriver_path, 0o755)

                logger.info(f"EdgeDriver downloaded successfully: {edgedriver_path}")

                # Clean up zip file
                zip_path.unlink()

                return str(edgedriver_path)
            else:
                raise Exception("EdgeDriver executable not found in downloaded archive")

        except Exception as e:
            logger.error(f"Error downloading EdgeDriver: {e}")
            return None

    def download_chromedriver(self, version):
        """Download ChromeDriver for the specified version"""
        try:
            # Determine platform-specific download URL
            if self.system == "windows":
                platform_name = "win64"
                executable_name = "chromedriver.exe"
            elif self.system == "linux":
                platform_name = "linux64"
                executable_name = "chromedriver"
            elif self.system == "darwin":
                platform_name = "mac-x64"
                executable_name = "chromedriver"
            else:
                raise Exception(f"Unsupported platform: {self.system}")
            
            # Download URL for Chrome for Testing
            download_url = f"https://storage.googleapis.com/chrome-for-testing-public/{version}/{platform_name}/chromedriver-{platform_name}.zip"
            
            logger.info(f"Downloading ChromeDriver {version} from {download_url}")
            
            response = requests.get(download_url, timeout=300)
            response.raise_for_status()
            
            # Save and extract
            zip_path = self.download_dir / f"chromedriver-{version}.zip"
            with open(zip_path, 'wb') as f:
                f.write(response.content)
            
            # Extract
            extract_dir = self.download_dir / f"chromedriver-{version}"
            extract_dir.mkdir(exist_ok=True)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Find the executable
            chromedriver_path = None
            for root, dirs, files in os.walk(extract_dir):
                if executable_name in files:
                    chromedriver_path = Path(root) / executable_name
                    break
            
            if chromedriver_path and chromedriver_path.exists():
                # Make executable on Unix systems
                if self.system in ["linux", "darwin"]:
                    os.chmod(chromedriver_path, 0o755)
                
                logger.info(f"ChromeDriver downloaded successfully: {chromedriver_path}")
                
                # Clean up zip file
                zip_path.unlink()
                
                return str(chromedriver_path)
            else:
                raise Exception("ChromeDriver executable not found in downloaded archive")
                
        except Exception as e:
            logger.error(f"Error downloading ChromeDriver: {e}")
            return None
    
    def get_webdriver_path(self):
        """Get or download the appropriate WebDriver (Chrome or Edge)"""
        try:
            # Detect browser
            browser, version = self.detect_browser()
            if not browser or not version:
                logger.warning("Could not detect any supported browser, using Chrome fallback")
                browser = "chrome"
                version = "140.0.6803.0"  # Recent stable version

            logger.info(f"Using {browser.title()} version: {version}")

            if browser == "edge":
                return self.get_edgedriver_path(version)
            else:  # chrome
                return self.get_chromedriver_path(version)

        except Exception as e:
            logger.error(f"Error managing WebDriver: {e}")
            return None

    def get_edgedriver_path(self, edge_version):
        """Get or download the appropriate EdgeDriver"""
        try:
            logger.info(f"Using Edge version: {edge_version}")

            # For Edge, the driver version usually matches the browser version
            edgedriver_version = edge_version

            # Check if we already have this version
            version_dir = self.download_dir / f"edgedriver-{edgedriver_version}"
            executable_name = "msedgedriver.exe" if self.system == "windows" else "msedgedriver"

            # Look for existing EdgeDriver
            for root, dirs, files in os.walk(version_dir):
                if executable_name in files:
                    existing_path = Path(root) / executable_name
                    if existing_path.exists():
                        logger.info(f"Using existing EdgeDriver: {existing_path}")
                        return str(existing_path)

            # Download if not found
            logger.info(f"Downloading EdgeDriver version {edgedriver_version}")
            return self.download_edgedriver(edgedriver_version)

        except Exception as e:
            logger.error(f"Error managing EdgeDriver: {e}")
            return None

    def get_chromedriver_path(self, chrome_version):
        """Get or download the appropriate ChromeDriver"""
        try:
            logger.info(f"Using Chrome version: {chrome_version}")

            # Get compatible ChromeDriver version
            chromedriver_version = self.get_compatible_chromedriver_version(chrome_version)
            if not chromedriver_version:
                logger.warning("Could not determine compatible ChromeDriver version, using fallback")
                # Use the major version as fallback
                major_version = chrome_version.split('.')[0]
                chromedriver_version = f"{major_version}.0.6803.0"

            logger.info(f"Using ChromeDriver version: {chromedriver_version}")

            # Check if we already have this version
            version_dir = self.download_dir / f"chromedriver-{chromedriver_version}"
            executable_name = "chromedriver.exe" if self.system == "windows" else "chromedriver"

            # Look for existing ChromeDriver
            for root, dirs, files in os.walk(version_dir):
                if executable_name in files:
                    existing_path = Path(root) / executable_name
                    if existing_path.exists():
                        logger.info(f"Using existing ChromeDriver: {existing_path}")
                        return str(existing_path)

            # Download if not found
            logger.info(f"Downloading ChromeDriver version {chromedriver_version}")
            return self.download_chromedriver(chromedriver_version)

        except Exception as e:
            logger.error(f"Error managing ChromeDriver: {e}")
            return None
    
    def create_webdriver(self, headless=True, additional_options=None):
        """Create a WebDriver instance (Chrome or Edge) with proper configuration"""
        try:
            # Get WebDriver path
            webdriver_path = self.get_webdriver_path()
            if not webdriver_path:
                logger.error("Could not obtain WebDriver")
                return None

            # Determine which browser we're using
            if self.detected_browser == "edge":
                return self.create_edge_driver(webdriver_path, headless, additional_options)
            else:  # chrome or fallback
                return self.create_chrome_driver(webdriver_path, headless, additional_options)

        except Exception as e:
            logger.error(f"Error creating WebDriver: {e}")
            return None

    def create_edge_driver(self, edgedriver_path, headless=True, additional_options=None):
        """Create an Edge WebDriver instance"""
        try:
            # Setup Edge options
            edge_options = EdgeOptions()

            if headless:
                edge_options.add_argument("--headless")

            # Standard options for stability
            edge_options.add_argument("--disable-gpu")
            edge_options.add_argument("--no-sandbox")
            edge_options.add_argument("--disable-dev-shm-usage")
            edge_options.add_argument("--window-size=1920,1080")
            edge_options.add_argument("--disable-blink-features=AutomationControlled")
            edge_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            edge_options.add_experimental_option('useAutomationExtension', False)

            # Add any additional options
            if additional_options:
                for option in additional_options:
                    edge_options.add_argument(option)

            # Create service
            service = EdgeService(edgedriver_path)

            # Create WebDriver
            driver = webdriver.Edge(service=service, options=edge_options)

            # Execute script to remove webdriver property
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            logger.info("Edge WebDriver created successfully")
            return driver

        except Exception as e:
            logger.error(f"Error creating Edge WebDriver: {e}")
            return None

    def create_chrome_driver(self, chromedriver_path, headless=True, additional_options=None):
        """Create a Chrome WebDriver instance"""
        try:
            # Setup Chrome options
            chrome_options = Options()

            if headless:
                chrome_options.add_argument("--headless")

            # Standard options for stability
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)

            # Add any additional options
            if additional_options:
                for option in additional_options:
                    chrome_options.add_argument(option)

            # Create service
            service = Service(chromedriver_path)

            # Create WebDriver
            driver = webdriver.Chrome(service=service, options=chrome_options)

            # Execute script to remove webdriver property
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            logger.info("Chrome WebDriver created successfully")
            return driver

        except Exception as e:
            logger.error(f"Error creating Chrome WebDriver: {e}")
            return None

# Convenience functions for easy import
def get_chrome_driver(headless=True, additional_options=None):
    """Get a WebDriver instance with automatic driver management (Chrome or Edge)"""
    manager = WebDriverManager(browser_preference="auto")
    return manager.create_webdriver(headless=headless, additional_options=additional_options)

def get_edge_driver(headless=True, additional_options=None):
    """Get an Edge WebDriver instance with automatic EdgeDriver management"""
    manager = WebDriverManager(browser_preference="edge")
    return manager.create_webdriver(headless=headless, additional_options=additional_options)

def get_specific_chrome_driver(headless=True, additional_options=None):
    """Get a Chrome WebDriver instance specifically (will fail if Chrome not available)"""
    manager = WebDriverManager(browser_preference="chrome")
    return manager.create_webdriver(headless=headless, additional_options=additional_options)
