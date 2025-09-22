"""
Demo script to show the logging functionality in action
This script demonstrates how the logging system works for the ODF project
"""

import time
import random
from logging_config import setup_script_logging, ODFLogger
import pandas as pd

def main():
    """Main demonstration function"""
    
    # Setup logging
    logger = setup_script_logging("DEMO", "INFO")
    odf_logger = ODFLogger("DEMO")
    odf_logger.logger = logger
    
    # Demonstrate section logging
    odf_logger.log_section_start("Demo Initialization")
    logger.info("This is a demonstration of the ODF logging system")
    logger.info("The logging system provides comprehensive tracking of execution")
    odf_logger.log_section_end("Demo Initialization")
    
    # Demonstrate progress logging
    odf_logger.log_section_start("Progress Tracking Demo")
    total_items = 10
    logger.info(f"Processing {total_items} demo items...")
    
    for i in range(1, total_items + 1):
        # Simulate some work
        time.sleep(0.5)
        
        # Log progress
        odf_logger.log_progress(i, total_items, "demo items")
        
        # Simulate occasional warnings or errors
        if i == 3:
            logger.warning("This is a sample warning message")
        elif i == 7:
            logger.error("This is a sample error message (non-critical)")
        else:
            logger.info(f"Successfully processed demo item {i}")
    
    odf_logger.log_section_end("Progress Tracking Demo")
    
    # Demonstrate DataFrame logging
    odf_logger.log_section_start("DataFrame Analysis Demo")
    
    # Create sample data
    sample_data = {
        'Project': [f'Project_{i}' for i in range(1, 6)],
        'Status': random.choices(['Active', 'Completed', 'Pending'], k=5),
        'Budget': [random.randint(10000, 100000) for _ in range(5)],
        'Region': random.choices(['Europe', 'Africa', 'Asia'], k=5)
    }
    
    df = pd.DataFrame(sample_data)
    logger.info("Created sample DataFrame for demonstration")
    
    # Log DataFrame information
    odf_logger.log_dataframe_info(df, "Sample Projects DataFrame")
    
    # Demonstrate file operations logging
    filename = "demo_output.csv"
    try:
        df.to_csv(filename, index=False)
        odf_logger.log_file_operation("CSV export", filename, True)
    except Exception as e:
        odf_logger.log_file_operation("CSV export", filename, False, str(e))
    
    odf_logger.log_section_end("DataFrame Analysis Demo")
    
    # Demonstrate web scraping stats logging
    odf_logger.log_section_start("Web Scraping Stats Demo")
    
    # Simulate web scraping statistics
    pages_scraped = random.randint(5, 15)
    items_found = random.randint(50, 200)
    items_filtered = random.randint(10, 50)
    
    odf_logger.log_web_scraping_stats(pages_scraped, items_found, items_filtered)
    
    odf_logger.log_section_end("Web Scraping Stats Demo")
    
    # Final summary
    logger.info("="*60)
    logger.info("DEMO COMPLETED SUCCESSFULLY")
    logger.info("="*60)
    logger.info("Key features demonstrated:")
    logger.info("  ✓ Section-based logging with clear start/end markers")
    logger.info("  ✓ Progress tracking with percentage completion")
    logger.info("  ✓ DataFrame analysis and statistics logging")
    logger.info("  ✓ File operation success/failure tracking")
    logger.info("  ✓ Web scraping statistics logging")
    logger.info("  ✓ Different log levels (INFO, WARNING, ERROR)")
    logger.info("  ✓ Both console and file output")
    logger.info("")
    logger.info("Check the 'logs' directory for the complete log file!")


if __name__ == "__main__":
    main()
