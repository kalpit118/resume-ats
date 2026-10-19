import base64
import os

def generate_favicon():
    # Use the white icon mark as requested by the user
    source_icon = 'public/ResumeFit_Icon_Dark.png'
    if not os.path.exists(source_icon):
        source_icon = 'src/assets/ResumeFit_Icon_Dark.png'
    
    with open(source_icon, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 278 278" width="32" height="32">
  <image href="data:image/png;base64,{b64}" width="278" height="278" />
</svg>
'''
    with open('public/favicon.svg', 'w', encoding='utf-8') as f:
        f.write(svg)
    print("Favicon updated to white logo successfully!")

if __name__ == '__main__':
    generate_favicon()
