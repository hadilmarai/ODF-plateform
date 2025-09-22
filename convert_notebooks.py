#!/usr/bin/env python3
"""
Script to convert Jupyter notebooks to Python files
Extracts code cells from .ipynb files and creates standalone .py files
"""

import json
import os
import sys
from pathlib import Path

def extract_code_from_notebook(notebook_path):
    """
    Extract Python code from a Jupyter notebook
    
    Args:
        notebook_path (str): Path to the .ipynb file
        
    Returns:
        str: Combined Python code from all code cells
    """
    try:
        with open(notebook_path, 'r', encoding='utf-8') as f:
            notebook = json.load(f)
    except Exception as e:
        print(f"Error reading notebook {notebook_path}: {e}")
        return None
    
    code_cells = []
    
    # Add header comment
    notebook_name = Path(notebook_path).stem
    header = f'''"""
Converted from Jupyter notebook: {notebook_name}.ipynb
This file contains all the code cells from the original notebook.

Generated automatically - do not edit manually.
Original notebook: {notebook_path}
"""

'''
    code_cells.append(header)
    
    # Extract code from each cell
    cell_count = 0
    for i, cell in enumerate(notebook.get('cells', [])):
        if cell.get('cell_type') == 'code':
            cell_count += 1
            source = cell.get('source', [])
            
            # Handle both string and list formats
            if isinstance(source, list):
                cell_code = ''.join(source)
            else:
                cell_code = source
            
            # Skip empty cells
            if not cell_code.strip():
                continue
            
            # Add cell separator comment
            execution_count = cell.get('execution_count', 'None')
            cell_id = cell.get('id', f'cell_{i}')
            
            cell_header = f'''
# ============================================================================
# Cell {cell_count} (execution_count: {execution_count}, id: {cell_id})
# ============================================================================

'''
            code_cells.append(cell_header)
            code_cells.append(cell_code)
            code_cells.append('\n\n')
    
    return ''.join(code_cells)

def convert_notebook_to_python(notebook_path, output_path=None):
    """
    Convert a Jupyter notebook to a Python file
    
    Args:
        notebook_path (str): Path to the .ipynb file
        output_path (str, optional): Output path for .py file. If None, uses same name as notebook
    """
    if not os.path.exists(notebook_path):
        print(f"Error: Notebook file {notebook_path} not found")
        return False
    
    if output_path is None:
        output_path = Path(notebook_path).with_suffix('.py')
    
    print(f"Converting {notebook_path} to {output_path}...")
    
    # Extract code from notebook
    python_code = extract_code_from_notebook(notebook_path)
    
    if python_code is None:
        print(f"Failed to extract code from {notebook_path}")
        return False
    
    # Write Python file
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(python_code)
        print(f"✅ Successfully converted to {output_path}")
        return True
    except Exception as e:
        print(f"Error writing Python file {output_path}: {e}")
        return False

def main():
    """Main function to convert notebooks"""
    notebooks_to_convert = [
        'LLMODF.ipynb',
        'innovateuk.ipynb'
    ]
    
    success_count = 0
    total_count = len(notebooks_to_convert)
    
    print("🔄 Converting Jupyter notebooks to Python files...")
    print("=" * 60)
    
    for notebook in notebooks_to_convert:
        if convert_notebook_to_python(notebook):
            success_count += 1
        print()
    
    print("=" * 60)
    print(f"📊 Conversion Summary:")
    print(f"   Successfully converted: {success_count}/{total_count}")
    print(f"   Failed: {total_count - success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 All notebooks converted successfully!")
    else:
        print("⚠️  Some conversions failed. Check the errors above.")
    
    return success_count == total_count

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
