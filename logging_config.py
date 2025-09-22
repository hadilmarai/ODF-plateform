"""
Logging configuration module for ODF project
Provides centralized logging setup for both scripts and Jupyter notebooks
"""

import logging
import sys
import os
from datetime import datetime
from typing import Optional


class ODFLogger:
    """
    Centralized logging class for ODF project
    Handles both file and console logging with proper formatting
    """
    
    def __init__(self, name: str = "ODF", log_level: str = "INFO"):
        self.name = name
        self.log_level = getattr(logging, log_level.upper())
        self.logger = None
        self.log_filename = None
        
    def setup_logging(self, 
                     log_to_file: bool = True, 
                     log_to_console: bool = True,
                     log_dir: str = "logs",
                     include_debug: bool = False) -> logging.Logger:
        """
        Setup comprehensive logging configuration
        
        Args:
            log_to_file: Whether to log to file
            log_to_console: Whether to log to console
            log_dir: Directory for log files
            include_debug: Whether to include debug level logs
            
        Returns:
            Configured logger instance
        """
        
        # Create logs directory if it doesn't exist
        if log_to_file and not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        # Create timestamp for log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_filename = f'{log_dir}/{self.name.lower()}_{timestamp}.log'
        
        # Configure logging format
        detailed_format = '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        simple_format = '%(asctime)s - %(levelname)s - %(message)s'
        date_format = '%Y-%m-%d %H:%M:%S'
        
        # Set log level
        if include_debug:
            self.log_level = logging.DEBUG
            
        # Create handlers list
        handlers = []
        
        # File handler
        if log_to_file:
            file_handler = logging.FileHandler(self.log_filename, encoding='utf-8')
            file_handler.setLevel(self.log_level)
            file_formatter = logging.Formatter(detailed_format, date_format)
            file_handler.setFormatter(file_formatter)
            handlers.append(file_handler)
            
        # Console handler
        if log_to_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(self.log_level)
            console_formatter = logging.Formatter(simple_format, date_format)
            console_handler.setFormatter(console_formatter)
            handlers.append(console_handler)
        
        # Configure root logger
        logging.basicConfig(
            level=self.log_level,
            handlers=handlers,
            force=True  # Override any existing configuration
        )
        
        # Create logger instance
        self.logger = logging.getLogger(self.name)
        
        # Log initialization
        self.logger.info("="*60)
        self.logger.info(f"{self.name.upper()} - LOGGING INITIALIZED")
        self.logger.info("="*60)
        if log_to_file:
            self.logger.info(f"Log file: {self.log_filename}")
        self.logger.info(f"Log level: {logging.getLevelName(self.log_level)}")
        self.logger.info(f"Execution started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return self.logger
    
    def get_logger(self) -> Optional[logging.Logger]:
        """Get the configured logger instance"""
        return self.logger
    
    def log_section_start(self, section_name: str, level: str = "INFO"):
        """Log the start of a major section"""
        if self.logger:
            getattr(self.logger, level.lower())("="*50)
            getattr(self.logger, level.lower())(f"STARTING: {section_name.upper()}")
            getattr(self.logger, level.lower())("="*50)
    
    def log_section_end(self, section_name: str, level: str = "INFO"):
        """Log the end of a major section"""
        if self.logger:
            getattr(self.logger, level.lower())("="*50)
            getattr(self.logger, level.lower())(f"COMPLETED: {section_name.upper()}")
            getattr(self.logger, level.lower())("="*50)
    
    def log_progress(self, current: int, total: int, item_name: str = "items"):
        """Log progress information"""
        if self.logger:
            percentage = (current / total) * 100 if total > 0 else 0
            self.logger.info(f"Progress: {current}/{total} {item_name} ({percentage:.1f}%)")
    
    def log_dataframe_info(self, df, df_name: str = "DataFrame"):
        """Log information about a pandas DataFrame"""
        if self.logger:
            self.logger.info(f"{df_name} info:")
            self.logger.info(f"  - Shape: {df.shape}")
            self.logger.info(f"  - Columns: {list(df.columns)}")
            self.logger.info(f"  - Memory usage: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")
            
            # Log sample data
            if len(df) > 0:
                self.logger.info(f"  - Sample data (first 3 rows):")
                for i, (idx, row) in enumerate(df.head(3).iterrows()):
                    row_str = " | ".join([f"{col}: {str(val)[:30]}..." if len(str(val)) > 30 else f"{col}: {val}" 
                                         for col, val in row.items()])
                    self.logger.info(f"    {i+1}. {row_str}")
    
    def log_file_operation(self, operation: str, filename: str, success: bool = True, error: str = None):
        """Log file operations"""
        if self.logger:
            if success:
                self.logger.info(f"✓ {operation}: {filename}")
            else:
                self.logger.error(f"✗ {operation} failed: {filename}")
                if error:
                    self.logger.error(f"  Error: {error}")
    
    def log_web_scraping_stats(self, pages_scraped: int, items_found: int, items_filtered: int):
        """Log web scraping statistics"""
        if self.logger:
            self.logger.info("Web Scraping Statistics:")
            self.logger.info(f"  - Pages scraped: {pages_scraped}")
            self.logger.info(f"  - Items found: {items_found}")
            self.logger.info(f"  - Items filtered out: {items_filtered}")
            self.logger.info(f"  - Items kept: {items_found - items_filtered}")
            if items_found > 0:
                filter_rate = (items_filtered / items_found) * 100
                self.logger.info(f"  - Filter rate: {filter_rate:.1f}%")


def setup_notebook_logging(notebook_name: str = "NOTEBOOK", log_level: str = "INFO") -> logging.Logger:
    """
    Quick setup function for Jupyter notebooks
    
    Args:
        notebook_name: Name identifier for the notebook
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance
    """
    odf_logger = ODFLogger(name=notebook_name, log_level=log_level)
    return odf_logger.setup_logging(log_to_file=True, log_to_console=True, include_debug=(log_level.upper() == "DEBUG"))


def setup_script_logging(script_name: str = "SCRIPT", log_level: str = "INFO") -> logging.Logger:
    """
    Quick setup function for Python scripts
    
    Args:
        script_name: Name identifier for the script
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance
    """
    odf_logger = ODFLogger(name=script_name, log_level=log_level)
    return odf_logger.setup_logging(log_to_file=True, log_to_console=True, include_debug=(log_level.upper() == "DEBUG"))


# Example usage functions
def log_example():
    """Example of how to use the logging system"""
    logger = setup_script_logging("EXAMPLE", "INFO")
    
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    
    # Example with progress logging
    odf_logger = ODFLogger("EXAMPLE")
    odf_logger.setup_logging()
    
    odf_logger.log_section_start("Data Processing")
    for i in range(1, 6):
        odf_logger.log_progress(i, 5, "files")
    odf_logger.log_section_end("Data Processing")


if __name__ == "__main__":
    log_example()
