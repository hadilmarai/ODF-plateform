#!/usr/bin/env python3
"""
Test script to verify headless Chrome works
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_headless_chrome():
    print("🔄 Testing headless Chrome configuration...")
    
    try:
        # Configure Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Set up Chrome service
        service = Service(r"C:\Users\HADIL MARAI\Desktop\ODF\chromedriver-win64\chromedriver-win64\chromedriver.exe")
        
        print("🌐 Starting headless Chrome...")
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        print("📄 Loading test page...")
        driver.get("https://www.google.com")
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        print(f"✅ Page loaded successfully!")
        print(f"📊 Page title: {driver.title}")
        print(f"🔗 Current URL: {driver.current_url}")
        
        # Close the driver
        driver.quit()
        print("🎉 Headless Chrome test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Headless Chrome test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_headless_chrome()
    exit(0 if success else 1)
