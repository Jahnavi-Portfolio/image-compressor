import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace literal \` with `
    content = content.replace('\\`', '`')
    # Replace literal \$ with $
    content = content.replace('\\$', '$')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('frontend/dashboard.js')
fix_file('frontend/playground.js')
print("Fixed JS files.")
