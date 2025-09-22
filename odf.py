from selenium import webdriver
from utils.webdriver_manager import get_chrome_driver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import time
import logging
import sys
from datetime import datetime
import os

# Configure logging
def setup_logging():
    """Setup comprehensive logging configuration"""
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # Create timestamp for log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f'logs/odf_scraper_{timestamp}.log'

    # Configure logging format
    log_format = '%(asctime)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'

    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.FileHandler(log_filename, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Create logger instance
    logger = logging.getLogger(__name__)
    logger.info("="*60)
    logger.info("ODF EU FUNDING SCRAPER - EXECUTION STARTED")
    logger.info("="*60)
    logger.info(f"Log file: {log_filename}")
    logger.info(f"Execution started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    return logger

# Initialize logging
logger = setup_logging()

logger.info("Setting up Chrome WebDriver...")
# chrome_# options = Options()
# chrome_options.add_argument("--start-maximized")
chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
logger.info("Chrome options configured: maximized window, custom user agent")

chromedriver_path = r"C:\\Users\\HADIL MARAI\\Desktop\\ODF\\chromedriver-win64\\chromedriver.exe"
logger.info(f"ChromeDriver path: {chromedriver_path}")

try:
    # service = Service(...) # Replaced by webdriver_manager
    driver = get_chrome_driver(headless=False)
    logger.info("Chrome WebDriver initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Chrome WebDriver: {str(e)}")
    sys.exit(1)

base_url = "https://ec.europa.eu"
url = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?isExactMatch=true&status=31094501,31094502,31094503&order=DESC&pageNumber=1&pageSize=50&sortBy=sortStatus"
logger.info(f"Base URL: {base_url}")
logger.info(f"Starting URL: {url}")

logger.info("Navigating to the EU funding portal...")
try:
    driver.get(url)
    logger.info("Successfully loaded the initial page")
except Exception as e:
    logger.error(f"Failed to load initial page: {str(e)}")
    driver.quit()
    sys.exit(1)

results = []
page_num = 1
total_projects_processed = 0
total_projects_filtered = 0

logger.info("Starting main scraping process...")
logger.info("="*50)

try:
    while True:
        logger.info(f"Processing page {page_num}...")

        # Attendre que les projets soient chargés
        logger.info("Waiting for project elements to load...")
        try:
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "a.eui-u-text-link.eui-u-font-l.eui-u-font-regular"))
            )
            logger.info("Project elements loaded successfully")
        except Exception as e:
            logger.error(f"Timeout waiting for project elements: {str(e)}")
            break

        time.sleep(1)

        # Récupérer tous les liens de projets
        logger.info("Extracting project links from current page...")
        project_links = driver.find_elements(By.CSS_SELECTOR, "a.eui-u-text-link.eui-u-font-l.eui-u-font-regular")
        logger.info(f"Page {page_num}: Found {len(project_links)} projects")

        if len(project_links) == 0:
            logger.warning("No project links found on current page - ending scraping")
            break

        projects_on_page = 0
        projects_filtered_on_page = 0

        for i, link in enumerate(project_links, 1):
            logger.debug(f"Processing project {i}/{len(project_links)} on page {page_num}")

            try:
                titre = link.text.strip()
                url = link.get_attribute("href")
                if url and url.startswith("/"):
                    url = base_url + url

                logger.debug(f"Extracted title: '{titre[:50]}...' and URL: {url}")

                # Remonter dans le DOM pour trouver le statut
                status = "Unknown"
                try:
                    card_header = link.find_element(By.XPATH, "./ancestor::div[contains(@class, 'eui-card-header__container')]")
                    status_elem = card_header.find_element(By.XPATH, ".//span[contains(@class, 'eui-u-text-nowrap') and contains(@class, 'eui-label')]")
                    status = status_elem.text.strip()
                    logger.debug(f"Extracted status: '{status}'")
                except Exception as e:
                    logger.debug(f"Could not extract status for project '{titre[:30]}...': {str(e)}")

                # Filtrer : ignorer les CLOSED
                if status.lower() == "closed":
                    logger.debug(f"Filtering out CLOSED project: '{titre[:30]}...'")
                    projects_filtered_on_page += 1
                    continue

                results.append({
                    "project_title": titre,
                    "project_url": url,
                    "submission_status": status
                })

                projects_on_page += 1
                logger.info(f"✓ Added project: '{titre[:50]}...' | Status: {status}")

            except Exception as e:
                logger.error(f"Error processing project {i} on page {page_num}: {str(e)}")
                continue

        total_projects_processed += projects_on_page
        total_projects_filtered += projects_filtered_on_page
        logger.info(f"Page {page_num} summary: {projects_on_page} projects added, {projects_filtered_on_page} filtered out")

        # Pagination
        logger.info("Checking for next page...")
        try:
            next_buttons = driver.find_elements(By.CSS_SELECTOR, "button.eui-button.eui-button--icon-only[aria-disabled='false']")
            logger.debug(f"Found {len(next_buttons)} enabled navigation buttons")

            next_button = None
            for btn in next_buttons:
                if btn.find_elements(By.CSS_SELECTOR, "eui-icon-svg[icon='eui-caret-right']"):
                    next_button = btn
                    break

            if not next_button:
                logger.info("No more pages available - pagination complete")
                logger.info("Reached end of pagination (no next button found)")
                break

            logger.info("Next page button found - navigating...")
            driver.execute_script("arguments[0].scrollIntoView();", next_button)
            time.sleep(1)
            next_button.click()
            page_num += 1
            logger.info(f"Successfully navigated to page {page_num}")
            time.sleep(2)

        except Exception as e:
            logger.warning(f"Pagination ended due to exception: {str(e)}")
            logger.info("Reached end of pagination (exception occurred)")
            break

    # Sauvegarder dans un CSV
    logger.info("="*50)
    logger.info("SCRAPING COMPLETED - SAVING RESULTS")
    logger.info("="*50)

    logger.info(f"Total projects processed: {total_projects_processed}")
    logger.info(f"Total projects filtered out: {total_projects_filtered}")
    logger.info(f"Total pages scraped: {page_num}")
    logger.info(f"Final dataset size: {len(results)} projects")

    if results:
        try:
            df = pd.DataFrame(results)
            output_filename = "projets_ue_liste.csv"
            df.to_csv(output_filename, index=False, encoding="utf-8")
            logger.info(f"✓ Database successfully saved to '{output_filename}'")
            logger.info(f"CSV file contains {len(df)} rows and {len(df.columns)} columns")
            logger.info(f"Columns: {list(df.columns)}")

            # Log sample of data
            logger.info("Sample of scraped data:")
            for i, row in df.head(3).iterrows():
                logger.info(f"  {i+1}. {row['project_title'][:60]}... | {row['submission_status']}")

        except Exception as e:
            logger.error(f"Failed to save CSV file: {str(e)}")
    else:
        logger.warning("No data to save - results list is empty")

except Exception as e:
    logger.error(f"Critical error during scraping: {str(e)}")
    logger.error("Scraping terminated due to unexpected error")

finally:
    logger.info("="*50)
    logger.info("CLEANUP AND TERMINATION")
    logger.info("="*50)
    try:
        driver.quit()
        logger.info("✓ Chrome WebDriver closed successfully")
    except Exception as e:
        logger.error(f"Error closing WebDriver: {str(e)}")

    end_time = datetime.now()
    logger.info(f"Execution completed at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("="*60)
    logger.info("ODF EU FUNDING SCRAPER - EXECUTION COMPLETED")
    logger.info("="*60)
