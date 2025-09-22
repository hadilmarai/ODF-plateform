"""
ODF Flask API - Automated EU & UK Funding Analysis
Runs both LLMODF.ipynb and innovateuk.ipynb every 24 hours and provides API endpoints
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import os
import json
import threading
import time
from datetime import datetime, timedelta
import schedule
import logging
from logging_config import setup_script_logging
import traceback
import subprocess
import sys
import nbformat
from nbconvert.preprocessors import ExecutePreprocessor
import asyncio

app = Flask(__name__)
CORS(app)  # Enable CORS for development

# Setup logging
logger = setup_script_logging("ODF_API", "INFO")

# Global variables to store the latest data
latest_data = {
    "last_update": None,
    "status": "not_started",
    "eu_analysis": {
        "status": "not_started",
        "projects_count": 0,
        "relevant_count": 0,
        "llm_analyzed_count": 0,
        "error": None
    },
    "uk_analysis": {
        "status": "not_started", 
        "projects_count": 0,
        "relevant_count": 0,
        "llm_analyzed_count": 0,
        "error": None
    },
    "statistics": {},
    "error_message": None
}

# Configuration
CONFIG = {
    "update_interval_hours": 24,
    "data_dir": "data",
    "logs_dir": "logs",
    "notebooks": {
        "eu": "LLMODF.ipynb",
        "uk": "innovateuk.ipynb"
    }
}

class ODFAPIManager:
    """Manages the ODF API operations and scheduling"""
    
    def __init__(self):
        self.is_running = False
        self.setup_directories()
    
    def setup_directories(self):
        """Create necessary directories"""
        for dir_name in [CONFIG["data_dir"], CONFIG["logs_dir"]]:
            os.makedirs(dir_name, exist_ok=True)
    
    def execute_notebook(self, notebook_path, analysis_type):
        """Execute all cells in a Jupyter notebook"""
        try:
            logger.info(f"Starting {analysis_type} analysis: executing {notebook_path}")
            latest_data[f"{analysis_type}_analysis"]["status"] = "running"

            # Check if notebook exists
            if not os.path.exists(notebook_path):
                error_msg = f"Notebook not found: {notebook_path}"
                logger.error(error_msg)
                latest_data[f"{analysis_type}_analysis"]["status"] = "error"
                latest_data[f"{analysis_type}_analysis"]["error"] = error_msg
                return False

            # Set Windows event loop policy to avoid asyncio issues
            if sys.platform.startswith('win'):
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

            # Read the notebook
            with open(notebook_path, 'r', encoding='utf-8') as f:
                notebook = nbformat.read(f, as_version=4)

            # Configure the executor
            executor = ExecutePreprocessor(
                timeout=108000,  # 1 hour timeout
                kernel_name='python3',
                allow_errors=False  # Stop on first error
            )

            logger.info(f"Executing {len(notebook.cells)} cells in {notebook_path}")

            # Execute the notebook
            try:
                executor.preprocess(notebook, {'metadata': {'path': os.getcwd()}})
                logger.info(f"Successfully executed all cells in {notebook_path}")

                # Save the executed notebook (optional)
                executed_notebook_path = f"{notebook_path.replace('.ipynb', '_executed.ipynb')}"
                with open(executed_notebook_path, 'w', encoding='utf-8') as f:
                    nbformat.write(notebook, f)

                latest_data[f"{analysis_type}_analysis"]["status"] = "completed"
                self.update_analysis_stats(analysis_type)
                return True

            except Exception as exec_error:
                error_msg = f"Error executing notebook cells: {str(exec_error)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())

                # Try to save partial results
                try:
                    partial_notebook_path = f"{notebook_path.replace('.ipynb', '_partial.ipynb')}"
                    with open(partial_notebook_path, 'w', encoding='utf-8') as f:
                        nbformat.write(notebook, f)
                    logger.info(f"Saved partial execution to {partial_notebook_path}")
                except:
                    pass

                latest_data[f"{analysis_type}_analysis"]["status"] = "error"
                latest_data[f"{analysis_type}_analysis"]["error"] = error_msg
                return False

        except Exception as e:
            error_msg = f"Error setting up notebook execution for {analysis_type}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            latest_data[f"{analysis_type}_analysis"]["status"] = "error"
            latest_data[f"{analysis_type}_analysis"]["error"] = error_msg
            return False
    
    def update_analysis_stats(self, analysis_type):
        """Update statistics after notebook execution"""
        try:
            if analysis_type == "eu":
                # Check for EU analysis output files (in order of preference)
                eu_final_files = [
                    "df_final_yes.xlsx",           # Final LLM results
                    "df_LLM_YES_EU.xlsx",          # Alternative LLM results
                    "df_yes_final.csv"             # CSV version
                ]

                for filename in eu_final_files:
                    if os.path.exists(filename):
                        try:
                            if filename.endswith('.xlsx'):
                                df = pd.read_excel(filename)
                            else:
                                df = pd.read_csv(filename)
                            latest_data["eu_analysis"]["llm_analyzed_count"] = len(df)
                            logger.info(f"EU LLM results loaded from {filename}: {len(df)} projects")
                            break
                        except Exception as e:
                            logger.warning(f"Could not read {filename}: {e}")

                # Check for EU keyword analysis files
                eu_keyword_files = [
                    "resultats_pertinenceYES_keywords.xlsx",
                    "projects_with_pertinence.csv"
                ]

                for filename in eu_keyword_files:
                    if os.path.exists(filename):
                        try:
                            if filename.endswith('.xlsx'):
                                df = pd.read_excel(filename)
                            else:
                                df = pd.read_csv(filename)
                            latest_data["eu_analysis"]["projects_count"] = len(df)
                            if "Pertinence" in df.columns:
                                latest_data["eu_analysis"]["relevant_count"] = len(df[df["Pertinence"] == "Yes"])
                            logger.info(f"EU keyword results loaded from {filename}: {len(df)} projects")
                            break
                        except Exception as e:
                            logger.warning(f"Could not read {filename}: {e}")

            elif analysis_type == "uk":
                # Check for UK analysis output files (in order of preference)
                uk_final_files = [
                    "df_final_yes_uk_llm.xlsx",    # Final LLM results
                    "df_final_ukllm.xlsx",         # Alternative LLM results
                    "df_yes_avec_pertinence_et_resume_uk.csv"  # CSV version
                ]

                for filename in uk_final_files:
                    if os.path.exists(filename):
                        try:
                            if filename.endswith('.xlsx'):
                                df = pd.read_excel(filename)
                            else:
                                df = pd.read_csv(filename)
                            latest_data["uk_analysis"]["llm_analyzed_count"] = len(df)
                            logger.info(f"UK LLM results loaded from {filename}: {len(df)} projects")
                            break
                        except Exception as e:
                            logger.warning(f"Could not read {filename}: {e}")

                # Check for UK keyword analysis files
                uk_keyword_files = [
                    "projets_UKRI_with_keywords.xlsx",
                    "projets_pertinents_keywords_InnUK_from_all_description.xlsx"
                ]

                for filename in uk_keyword_files:
                    if os.path.exists(filename):
                        try:
                            if filename.endswith('.xlsx'):
                                df = pd.read_excel(filename)
                            else:
                                df = pd.read_csv(filename)
                            latest_data["uk_analysis"]["projects_count"] = len(df)
                            if "Pertinence" in df.columns:
                                latest_data["uk_analysis"]["relevant_count"] = len(df[df["Pertinence"] == "Yes"])
                            logger.info(f"UK keyword results loaded from {filename}: {len(df)} projects")
                            break
                        except Exception as e:
                            logger.warning(f"Could not read {filename}: {e}")

        except Exception as e:
            logger.error(f"Error updating {analysis_type} stats: {str(e)}")
    
    def run_full_analysis(self):
        """Run both notebooks sequentially"""
        if self.is_running:
            logger.warning("Analysis already running, skipping this execution")
            return
        
        self.is_running = True
        latest_data["status"] = "running"
        latest_data["error_message"] = None
        
        try:
            logger.info("Starting full ODF analysis workflow...")
            
            # Run EU analysis
            logger.info("Step 1: Running EU funding analysis (LLMODF.ipynb)...")
            eu_success = self.execute_notebook(CONFIG["notebooks"]["eu"], "eu")

            # Run UK analysis
            logger.info("Step 2: Running UK funding analysis (innovateuk.ipynb)...")
            uk_success = self.execute_notebook(CONFIG["notebooks"]["uk"], "uk")
            
            # Update overall status
            if eu_success and uk_success:
                latest_data["status"] = "completed"
                logger.info("Full analysis completed successfully!")
            elif eu_success or uk_success:
                latest_data["status"] = "partial_success"
                logger.warning("Analysis completed with some failures")
            else:
                latest_data["status"] = "failed"
                logger.error("Analysis failed for both notebooks")
            
            # Update timestamp
            latest_data["last_update"] = datetime.now().isoformat()
            
            # Generate combined statistics
            self.generate_combined_statistics()
            
        except Exception as e:
            logger.error(f"Error during analysis: {str(e)}")
            logger.error(traceback.format_exc())
            latest_data["status"] = "error"
            latest_data["error_message"] = str(e)
        
        finally:
            self.is_running = False
    
    def generate_combined_statistics(self):
        """Generate combined statistics from both analyses"""
        try:
            stats = {
                "total_projects": latest_data["eu_analysis"]["projects_count"] + latest_data["uk_analysis"]["projects_count"],
                "total_relevant": latest_data["eu_analysis"]["relevant_count"] + latest_data["uk_analysis"]["relevant_count"],
                "total_llm_analyzed": latest_data["eu_analysis"]["llm_analyzed_count"] + latest_data["uk_analysis"]["llm_analyzed_count"],
                "eu_projects": latest_data["eu_analysis"]["projects_count"],
                "uk_projects": latest_data["uk_analysis"]["projects_count"],
                "eu_relevant": latest_data["eu_analysis"]["relevant_count"],
                "uk_relevant": latest_data["uk_analysis"]["relevant_count"],
                "last_update": latest_data["last_update"]
            }
            
            # Calculate percentages
            if stats["total_projects"] > 0:
                stats["relevance_rate"] = round((stats["total_relevant"] / stats["total_projects"]) * 100, 2)
            else:
                stats["relevance_rate"] = 0
            
            latest_data["statistics"] = stats
            
        except Exception as e:
            logger.error(f"Error generating statistics: {str(e)}")
    
    def schedule_analysis(self):
        """Schedule the analysis to run every 24 hours"""
        schedule.every(CONFIG["update_interval_hours"]).hours.do(self.run_full_analysis)
        
        # Run immediately on startup
        threading.Thread(target=self.run_full_analysis, daemon=True).start()
        
        # Start scheduler in background
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        threading.Thread(target=run_scheduler, daemon=True).start()
        logger.info(f"Scheduled analysis to run every {CONFIG['update_interval_hours']} hours")

# Initialize the API manager
api_manager = ODFAPIManager()

# API Endpoints

@app.route('/')
def home():
    """API home page with documentation"""
    return jsonify({
        "message": "ODF EU & UK Funding Analysis API",
        "version": "1.0.0",
        "description": "Automated analysis of EU and UK funding opportunities",
        "notebooks": {
            "eu_analysis": CONFIG["notebooks"]["eu"],
            "uk_analysis": CONFIG["notebooks"]["uk"]
        },
        "endpoints": {
            "/status": "Get current analysis status",
            "/analysis/eu": "Get EU analysis results",
            "/analysis/uk": "Get UK analysis results",
            "/analysis/combined": "Get combined analysis results",
            "/statistics": "Get analysis statistics",
            "/trigger": "Manually trigger analysis",
            "/trigger/eu": "Manually trigger EU analysis only",
            "/trigger/uk": "Manually trigger UK analysis only",
            "/export/<type>/<format>": "Export data (eu/uk/combined, csv/json/excel)",
            "/files": "List available output files"
        },
        "last_update": latest_data["last_update"],
        "status": latest_data["status"]
    })

@app.route('/status')
def get_status():
    """Get current analysis status"""
    return jsonify({
        "overall_status": latest_data["status"],
        "last_update": latest_data["last_update"],
        "is_running": api_manager.is_running,
        "error_message": latest_data["error_message"],
        "next_scheduled_run": "Every 24 hours",
        "eu_analysis": latest_data["eu_analysis"],
        "uk_analysis": latest_data["uk_analysis"]
    })

@app.route('/analysis/eu')
def get_eu_analysis():
    """Get EU analysis results"""
    try:
        # Try to load the latest EU results (prioritize final LLM results)
        files_to_check = [
            ("df_final_yes.xlsx", "Final EU LLM Results"),
            ("df_LLM_YES_EU.xlsx", "EU LLM Analysis (Alternative)"),
            ("df_yes_final.csv", "EU LLM Results (CSV)"),
            ("df_LLM_ALL_EU.xlsx", "All EU LLM Analysis"),
            ("df_yes_avec_pertinence_et_resume.csv", "EU Results with LLM Analysis"),
            ("resultats_pertinenceYES_keywords.xlsx", "EU Keyword Analysis"),
            ("projects_with_pertinence.csv", "EU Keyword Analysis (CSV)"),
            ("ODF_project_dataset.csv", "ODF Reference Projects")
        ]

        results = {}
        for filename, description in files_to_check:
            if os.path.exists(filename):
                try:
                    if filename.endswith('.xlsx'):
                        df = pd.read_excel(filename)
                    else:
                        df = pd.read_csv(filename)

                    results[description] = {
                        "count": len(df),
                        "data": df.to_dict('records'),
                        "file": filename,
                        "columns": list(df.columns)
                    }
                except Exception as e:
                    results[description] = {"error": f"Failed to load {filename}: {str(e)}"}

        if not results:
            return jsonify({"error": "No EU analysis data available"}), 404

        return jsonify({
            "analysis_type": "EU Funding Opportunities",
            "status": latest_data["eu_analysis"]["status"],
            "last_update": latest_data["last_update"],
            "statistics": {
                "projects_count": latest_data["eu_analysis"]["projects_count"],
                "relevant_count": latest_data["eu_analysis"]["relevant_count"],
                "llm_analyzed_count": latest_data["eu_analysis"]["llm_analyzed_count"]
            },
            "results": results
        })

    except Exception as e:
        return jsonify({"error": f"Error loading EU analysis: {str(e)}"}), 500

@app.route('/analysis/uk')
def get_uk_analysis():
    """Get UK analysis results"""
    try:
        # Try to load the latest UK results (prioritize final LLM results)
        files_to_check = [
            ("df_final_yes_uk_llm.xlsx", "Final UK LLM Results"),
            ("df_final_ukllm.xlsx", "UK LLM Analysis (Alternative)"),
            ("df_yes_avec_pertinence_et_resume_uk.csv", "UK LLM Results (CSV)"),
            ("projets_UKRI_with_keywords.xlsx", "UK Keyword Analysis"),
            ("projets_pertinents_keywords_InnUK_from_all_description.xlsx", "UK Keyword Analysis (Detailed)"),
            ("projets_pertinents_keywords_InnUK.xlsx", "UK Keyword Analysis (Basic)"),
            ("ukri_projects_with_keywords.csv", "UK Keyword Analysis (CSV)"),
            ("projets_UKRI_full.txt", "UK Raw Projects Data")
        ]

        results = {}
        for filename, description in files_to_check:
            if os.path.exists(filename):
                try:
                    if filename.endswith('.xlsx'):
                        df = pd.read_excel(filename)
                    elif filename.endswith('.csv'):
                        df = pd.read_csv(filename)
                    elif filename.endswith('.txt'):
                        # For text files, just show basic info
                        with open(filename, 'r', encoding='utf-8') as f:
                            content = f.read()
                        results[description] = {
                            "count": len(content.split('\n')),
                            "file": filename,
                            "type": "text_file",
                            "size_kb": round(len(content) / 1024, 2)
                        }
                        continue
                    else:
                        continue

                    results[description] = {
                        "count": len(df),
                        "data": df.to_dict('records'),
                        "file": filename,
                        "columns": list(df.columns)
                    }
                except Exception as e:
                    results[description] = {"error": f"Failed to load {filename}: {str(e)}"}

        if not results:
            return jsonify({"error": "No UK analysis data available"}), 404

        return jsonify({
            "analysis_type": "UK Funding Opportunities",
            "status": latest_data["uk_analysis"]["status"],
            "last_update": latest_data["last_update"],
            "statistics": {
                "projects_count": latest_data["uk_analysis"]["projects_count"],
                "relevant_count": latest_data["uk_analysis"]["relevant_count"],
                "llm_analyzed_count": latest_data["uk_analysis"]["llm_analyzed_count"]
            },
            "results": results
        })

    except Exception as e:
        return jsonify({"error": f"Error loading UK analysis: {str(e)}"}), 500

@app.route('/analysis/combined')
def get_combined_analysis():
    """Get combined analysis results from both EU and UK"""
    try:
        combined_results = {}

        # Load EU final results
        if os.path.exists("df_final_yes.xlsx"):
            eu_df = pd.read_excel("df_final_yes.xlsx")
            eu_df['source'] = 'EU'
            combined_results['eu_final'] = eu_df.to_dict('records')

        # Load UK final results
        if os.path.exists("df_final_yes_uk_llm.xlsx"):
            uk_df = pd.read_excel("df_final_yes_uk_llm.xlsx")
            uk_df['source'] = 'UK'
            combined_results['uk_final'] = uk_df.to_dict('records')

        # Combine if both exist
        if 'eu_final' in combined_results and 'uk_final' in combined_results:
            # Note: Column names might be different, so we'll keep them separate for now
            combined_results['summary'] = {
                "total_eu_opportunities": len(combined_results['eu_final']),
                "total_uk_opportunities": len(combined_results['uk_final']),
                "total_opportunities": len(combined_results['eu_final']) + len(combined_results['uk_final'])
            }

        if not combined_results:
            return jsonify({"error": "No combined analysis data available"}), 404

        return jsonify({
            "analysis_type": "Combined EU & UK Analysis",
            "last_update": latest_data["last_update"],
            "results": combined_results
        })

    except Exception as e:
        return jsonify({"error": f"Error loading combined analysis: {str(e)}"}), 500

@app.route('/statistics')
def get_statistics():
    """Get analysis statistics"""
    return jsonify({
        "statistics": latest_data["statistics"],
        "last_update": latest_data["last_update"],
        "status": latest_data["status"],
        "detailed_stats": {
            "eu_analysis": latest_data["eu_analysis"],
            "uk_analysis": latest_data["uk_analysis"]
        }
    })

@app.route('/trigger', methods=['POST'])
def trigger_full_analysis():
    """Manually trigger full analysis (both notebooks)"""
    if api_manager.is_running:
        return jsonify({"error": "Analysis already running"}), 409

    # Start analysis in background
    threading.Thread(target=api_manager.run_full_analysis, daemon=True).start()

    return jsonify({
        "message": "Full analysis triggered successfully",
        "status": "started",
        "notebooks": ["LLMODF.ipynb", "innovateuk.ipynb"]
    })

@app.route('/trigger/eu', methods=['POST'])
def trigger_eu_analysis():
    """Manually trigger EU analysis only"""
    if api_manager.is_running:
        return jsonify({"error": "Analysis already running"}), 409

    def run_eu_only():
        api_manager.is_running = True
        try:
            api_manager.execute_notebook(CONFIG["notebooks"]["eu"], "eu")
            latest_data["last_update"] = datetime.now().isoformat()
        finally:
            api_manager.is_running = False

    threading.Thread(target=run_eu_only, daemon=True).start()

    return jsonify({
        "message": "EU analysis triggered successfully",
        "status": "started",
        "notebook": "LLMODF.ipynb"
    })

@app.route('/trigger/uk', methods=['POST'])
def trigger_uk_analysis():
    """Manually trigger UK analysis only"""
    if api_manager.is_running:
        return jsonify({"error": "Analysis already running"}), 409

    def run_uk_only():
        api_manager.is_running = True
        try:
            api_manager.execute_notebook(CONFIG["notebooks"]["uk"], "uk")
            latest_data["last_update"] = datetime.now().isoformat()
        finally:
            api_manager.is_running = False

    threading.Thread(target=run_uk_only, daemon=True).start()

    return jsonify({
        "message": "UK analysis triggered successfully",
        "status": "started",
        "notebook": "innovateuk.ipynb"
    })

@app.route('/export/<analysis_type>/<format>')
def export_data(analysis_type, format):
    """Export data in different formats"""
    if format not in ['csv', 'json', 'excel']:
        return jsonify({"error": "Unsupported format. Use: csv, json, excel"}), 400

    if analysis_type not in ['eu', 'uk', 'combined']:
        return jsonify({"error": "Unsupported analysis type. Use: eu, uk, combined"}), 400

    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Determine which file to export
        if analysis_type == 'eu':
            source_file = "df_final_yes.xlsx"
            filename_base = f"eu_analysis_{timestamp}"
        elif analysis_type == 'uk':
            source_file = "df_final_yes_uk_llm.xlsx"
            filename_base = f"uk_analysis_{timestamp}"
        else:  # combined
            # For combined, we'll create a new file
            if not (os.path.exists("df_final_yes.xlsx") and os.path.exists("df_final_yes_uk_llm.xlsx")):
                return jsonify({"error": "Combined data not available"}), 404

            eu_df = pd.read_excel("df_final_yes.xlsx")
            uk_df = pd.read_excel("df_final_yes_uk_llm.xlsx")
            eu_df['source'] = 'EU'
            uk_df['source'] = 'UK'

            # Save combined data temporarily
            source_file = f"combined_analysis_{timestamp}.xlsx"
            filename_base = f"combined_analysis_{timestamp}"

            # Create combined file (we'll handle this in the format-specific code)

        if analysis_type != 'combined' and not os.path.exists(source_file):
            return jsonify({"error": f"No {analysis_type} data available for export"}), 404

        # Load data
        if analysis_type == 'combined':
            eu_df = pd.read_excel("df_final_yes.xlsx")
            uk_df = pd.read_excel("df_final_yes_uk_llm.xlsx")
            eu_df['source'] = 'EU'
            uk_df['source'] = 'UK'
            # Note: Since column structures might be different, we'll export separately
        else:
            df = pd.read_excel(source_file)

        # Export based on format
        if format == 'csv':
            if analysis_type == 'combined':
                # Export as separate CSV files in a zip
                import zipfile
                zip_path = f"{CONFIG['data_dir']}/{filename_base}.zip"
                with zipfile.ZipFile(zip_path, 'w') as zipf:
                    eu_csv = f"eu_analysis_{timestamp}.csv"
                    uk_csv = f"uk_analysis_{timestamp}.csv"
                    eu_df.to_csv(eu_csv, index=False)
                    uk_df.to_csv(uk_csv, index=False)
                    zipf.write(eu_csv)
                    zipf.write(uk_csv)
                    os.remove(eu_csv)
                    os.remove(uk_csv)
                return send_file(zip_path, as_attachment=True)
            else:
                filepath = f"{CONFIG['data_dir']}/{filename_base}.csv"
                df.to_csv(filepath, index=False)
                return send_file(filepath, as_attachment=True)

        elif format == 'json':
            if analysis_type == 'combined':
                filepath = f"{CONFIG['data_dir']}/{filename_base}.json"
                combined_data = {
                    "eu_analysis": eu_df.to_dict('records'),
                    "uk_analysis": uk_df.to_dict('records'),
                    "export_timestamp": timestamp
                }
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(combined_data, f, ensure_ascii=False, indent=2)
            else:
                filepath = f"{CONFIG['data_dir']}/{filename_base}.json"
                data = df.to_dict('records')
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            return send_file(filepath, as_attachment=True)

        elif format == 'excel':
            filepath = f"{CONFIG['data_dir']}/{filename_base}.xlsx"
            if analysis_type == 'combined':
                with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
                    eu_df.to_excel(writer, sheet_name='EU_Analysis', index=False)
                    uk_df.to_excel(writer, sheet_name='UK_Analysis', index=False)
            else:
                df.to_excel(filepath, index=False)
            return send_file(filepath, as_attachment=True)

    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}"}), 500

@app.route('/files')
def list_files():
    """List available output files"""
    output_files = {}

    # Define expected output files
    file_patterns = {
        "EU Analysis": [
            "df_final_yes.xlsx"
        ],
        "UK Analysis": [
            "df_final_ukllm.xlsx"
        ]
    }

    for category, files in file_patterns.items():
        output_files[category] = []
        for filename in files:
            if os.path.exists(filename):
                stat = os.stat(filename)
                output_files[category].append({
                    "filename": filename,
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024*1024), 2),
                    "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "exists": True
                })
            else:
                output_files[category].append({
                    "filename": filename,
                    "exists": False
                })

    return jsonify({
        "files": output_files,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime": "running",
        "notebooks_available": {
            "eu": os.path.exists(CONFIG["notebooks"]["eu"]),
            "uk": os.path.exists(CONFIG["notebooks"]["uk"])
        },
        "chromedriver_available": os.path.exists(r"chromedriver-win64\chromedriver.exe")
    })

if __name__ == '__main__':
    logger.info("Starting ODF API server...")

    # Check if notebooks exist
    for analysis_type, notebook_path in CONFIG["notebooks"].items():
        if os.path.exists(notebook_path):
            logger.info(f"✓ Found {analysis_type.upper()} notebook: {notebook_path}")
        else:
            logger.warning(f"✗ Missing {analysis_type.upper()} notebook: {notebook_path}")

    # Check if required dependencies are available
    try:
        import nbformat
        import nbconvert
        logger.info("✓ Notebook execution dependencies available")
    except ImportError as e:
        logger.error(f"✗ Missing notebook dependencies: {e}")
        logger.error("Install with: pip install nbformat nbconvert")
        sys.exit(1)

    try:
        import selenium
        import groq
        logger.info("✓ Core analysis dependencies available")
    except ImportError as e:
        logger.error(f"✗ Missing analysis dependencies: {e}")
        sys.exit(1)

    # Start the scheduler
    api_manager.schedule_analysis()

    # Run Flask app
    logger.info("API server starting on http://localhost:5000")
    logger.info("Available endpoints:")
    logger.info("  - GET  /status - Analysis status")
    logger.info("  - GET  /analysis/eu - EU analysis results")
    logger.info("  - GET  /analysis/uk - UK analysis results")
    logger.info("  - GET  /analysis/combined - Combined results")
    logger.info("  - GET  /statistics - Analysis statistics")
    logger.info("  - POST /trigger - Trigger full analysis")
    logger.info("  - POST /trigger/eu - Trigger EU analysis only")
    logger.info("  - POST /trigger/uk - Trigger UK analysis only")
    logger.info("  - GET  /export/<type>/<format> - Export data")
    logger.info("  - GET  /files - List output files")
    logger.info("  - GET  /health - Health check")
    logger.info("")
    logger.info("Notebooks will run automatically every 24 hours")
    logger.info("First execution will start immediately...")

    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
