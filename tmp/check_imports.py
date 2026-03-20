import sys
import os
import importlib.util

def find_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    imports = []
    for line in lines:
        line = line.strip()
        if line.startswith('import ') or line.startswith('from '):
            imports.append(line)
    return imports

print("Checking imports in D:\Voice-AI-Platform\app\agent.py")
for imp in find_imports(r'D:\Voice-AI-Platform\app\agent.py'):
    print(f"  {imp}")
