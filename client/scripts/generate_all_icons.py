#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SOURCE_PATH = '/home/sourabh/.gemini/antigravity-ide/brain/8b65dd50-510b-4275-88f1-fc883f57e512/ai_monefy_app_icon_1792074929565.jpg'
CLIENT_DIR = '/mnt/data/projects/ai-monefy/client'
PUBLIC_DIR = os.path.join(CLIENT_DIR, 'public')
RES_DIR = os.path.join(CLIENT_DIR, 'android/app/src/main/res')

os.makedirs(PUBLIC_DIR, exist_ok=True)

print(f"Loading master image from: {SOURCE_PATH}")
src = Image.open(SOURCE_PATH).convert('RGBA')

# 1. Master Square Base (1024x1024)
base_1024 = src.copy()

# 2. Master Round Icon (1024x1024) with 4x anti-aliased circular alpha mask
mask_hi = Image.new('L', (4096, 4096), 0)
draw = ImageDraw.Draw(mask_hi)
draw.ellipse((0, 0, 4096, 4096), fill=255)
mask = mask_hi.resize((1024, 1024), Image.Resampling.LANCZOS)
round_1024 = base_1024.copy()
round_1024.putalpha(mask)

# 3. Master Adaptive Foreground (1080x1080)
# Extract glowing wheel with smooth alpha gradient to transparent
arr = np.array(src, dtype=float)
rgb = arr[:, :, :3]
bg_color = np.array([5, 8, 20], dtype=float)
dist = np.sqrt(np.sum((rgb - bg_color)**2, axis=-1))
alpha = np.clip((dist - 20) / 45.0, 0, 1)

h, w = arr.shape[:2]
cy, cx = 512, 512
y, x = np.ogrid[:h, :w]
r = np.sqrt((x - cx)**2 + (y - cy)**2)
radial_mask = np.clip((445 - r) / 25.0, 0, 1)
final_alpha = alpha * radial_mask

fg_arr = arr.copy()
fg_arr[:, :, 3] = final_alpha * 255
fg_extracted = Image.fromarray(fg_arr.astype(np.uint8))

# Scale to ~700px inside 1080x1080 (Android Safe Zone: 66-72dp out of 108dp)
fg_scaled = fg_extracted.resize((890, 890), Image.Resampling.LANCZOS)
fg_1080 = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
fg_1080.paste(fg_scaled, ((1080 - 890) // 2, (1080 - 890) // 2), fg_scaled)

# 4. Master Maskable PWA Icon (1024x1024) with 80% safe zone padding
maskable_1024 = Image.new('RGBA', (1024, 1024), (14, 18, 27, 255)) # #0E121B
scaled_for_maskable = base_1024.resize((820, 820), Image.Resampling.LANCZOS)
maskable_1024.paste(scaled_for_maskable, ((1024 - 820) // 2, (1024 - 820) // 2))

# ===================================================================
# GENERATE WEB ICONS
# ===================================================================
print("\n--- Generating Web Icons ---")

# favicon.ico (16, 32, 48)
base_1024.save(os.path.join(PUBLIC_DIR, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print("Generated favicon.ico")

# apple-touch-icon.png (180x180)
apple_touch = base_1024.resize((180, 180), Image.Resampling.LANCZOS)
apple_touch.save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'), format='PNG')
print("Generated apple-touch-icon.png (180x180)")

# icon-192.png (192x192)
icon_192 = base_1024.resize((192, 192), Image.Resampling.LANCZOS)
icon_192.save(os.path.join(PUBLIC_DIR, 'icon-192.png'), format='PNG')
print("Generated icon-192.png (192x192)")

# icon-512.png (512x512)
icon_512 = base_1024.resize((512, 512), Image.Resampling.LANCZOS)
icon_512.save(os.path.join(PUBLIC_DIR, 'icon-512.png'), format='PNG')
print("Generated icon-512.png (512x512)")

# icon-maskable-192.png (192x192)
maskable_192 = maskable_1024.resize((192, 192), Image.Resampling.LANCZOS)
maskable_192.save(os.path.join(PUBLIC_DIR, 'icon-maskable-192.png'), format='PNG')
print("Generated icon-maskable-192.png (192x192)")

# icon-maskable-512.png (512x512)
maskable_512 = maskable_1024.resize((512, 512), Image.Resampling.LANCZOS)
maskable_512.save(os.path.join(PUBLIC_DIR, 'icon-maskable-512.png'), format='PNG')
print("Generated icon-maskable-512.png (512x512)")

# Copy SVG icon to public/favicon.svg
svg_src = os.path.join(CLIENT_DIR, 'src/assets/icon.svg')
svg_dest = os.path.join(PUBLIC_DIR, 'favicon.svg')
with open(svg_src, 'r') as f_in, open(svg_dest, 'w') as f_out:
    f_out.write(f_in.read())
print("Copied favicon.svg to public/favicon.svg")

# ===================================================================
# GENERATE ANDROID MIPMAP ICONS
# ===================================================================
print("\n--- Generating Android Mipmap Icons ---")

densities = {
    'mipmap-mdpi': {'legacy': 48, 'fg': 108},
    'mipmap-hdpi': {'legacy': 72, 'fg': 162},
    'mipmap-xhdpi': {'legacy': 96, 'fg': 216},
    'mipmap-xxhdpi': {'legacy': 144, 'fg': 324},
    'mipmap-xxxhdpi': {'legacy': 192, 'fg': 432},
}

for folder, dims in densities.items():
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # 1. ic_launcher.png (legacy square/squircle)
    legacy_dim = dims['legacy']
    ic_launch = base_1024.resize((legacy_dim, legacy_dim), Image.Resampling.LANCZOS)
    ic_launch.save(os.path.join(folder_path, 'ic_launcher.png'), format='PNG')
    
    # 2. ic_launcher_round.png (legacy round)
    ic_round = round_1024.resize((legacy_dim, legacy_dim), Image.Resampling.LANCZOS)
    ic_round.save(os.path.join(folder_path, 'ic_launcher_round.png'), format='PNG')
    
    # 3. ic_launcher_foreground.png (adaptive foreground)
    fg_dim = dims['fg']
    ic_fg = fg_1080.resize((fg_dim, fg_dim), Image.Resampling.LANCZOS)
    ic_fg.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), format='PNG')
    
    print(f"Generated {folder}: ic_launcher ({legacy_dim}x{legacy_dim}), ic_launcher_round ({legacy_dim}x{legacy_dim}), ic_launcher_foreground ({fg_dim}x{fg_dim})")

# ===================================================================
# GENERATE ANDROID SPLASH SCREENS
# ===================================================================
print("\n--- Generating Android Splash Screens ---")

splash_screens = {
    'drawable/splash.png': (480, 320),
    'drawable-land-mdpi/splash.png': (480, 320),
    'drawable-land-hdpi/splash.png': (800, 480),
    'drawable-land-xhdpi/splash.png': (1280, 720),
    'drawable-land-xxhdpi/splash.png': (1600, 960),
    'drawable-land-xxxhdpi/splash.png': (1920, 1280),
    'drawable-port-mdpi/splash.png': (320, 480),
    'drawable-port-hdpi/splash.png': (480, 800),
    'drawable-port-xhdpi/splash.png': (720, 1280),
    'drawable-port-xxhdpi/splash.png': (960, 1600),
    'drawable-port-xxxhdpi/splash.png': (1280, 1920),
}

for rel_path, (w, h) in splash_screens.items():
    dest_path = os.path.join(RES_DIR, rel_path)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    # Background: #0E121B
    splash = Image.new('RGB', (w, h), (14, 18, 27))
    
    # Logo dimension: proportional to min dimension (35% of min dimension, min 140, max 420)
    min_dim = min(w, h)
    logo_size = int(max(140, min(min_dim * 0.38, 420)))
    
    logo_scaled = base_1024.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    pos_x = (w - logo_size) // 2
    pos_y = (h - logo_size) // 2
    
    splash.paste(logo_scaled, (pos_x, pos_y), logo_scaled if logo_scaled.mode == 'RGBA' else None)
    splash.save(dest_path, format='PNG')
    print(f"Generated {rel_path} ({w}x{h}, logo size {logo_size}x{logo_size})")

print("\nAll Web and Android icons generated successfully!")
