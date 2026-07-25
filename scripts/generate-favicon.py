#!/usr/bin/env python3
"""Generate retro-pixel favicon files for magmacrunch.com

Creates:
  - favicon-16.png (16x16)
  - favicon-32.png (32x32)
  - favicon.ico (multi-size: 16x16 + 32x32)
  - apple-touch-icon.png (180x180)

Design: Volcano with lava and lightning bolts
"""

from PIL import Image
import os

# Color palette
BLACK     = (8, 8, 8, 255)        # #080808 background
MTN_DARK  = (59, 0, 0, 255)       # #3b0000 dark mountain
MTN_MID   = (107, 0, 0, 255)      # #6b0000 mountain mid
MTN_RIM   = (150, 30, 30, 255)    # #961e1e mountain rim (subtle)
LAVA_HOT  = (255, 85, 0, 255)     # #ff5500 lava bright
LAVA_GLOW = (255, 119, 0, 255)    # #ff7700 lava glow
LAVA_BRIGHT = (255, 160, 0, 255)  # #ffa000 lava brightest
YELLOW    = (255, 224, 58, 255)   # #ffe03a lightning
WHITE     = (255, 248, 240, 255)  # #fff8f0 highlight

# 16x16 pixel grid
# . = BLACK, d = MTN_DARK, m = MTN_MID, r = MTN_RIM
# o = LAVA_HOT, g = LAVA_GLOW, b = LAVA_BRIGHT
# y = YELLOW, w = WHITE

PIXEL_MAP = [
    #0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
    ['.','y','.','.','.','.','.','.','.','.','.','.','.','.','y','.'],  # 0  lightning tips
    ['y','.','.','.','.','.','.','.','.','.','.','.','.','.','.','y'],  # 1
    ['.','y','.','.','d','d','.','.','.','.','d','d','.','.','y','.'],  # 2  mountain peaks
    ['.','y','.','d','m','m','d','.','.','d','m','m','d','.','y','.'],  # 3
    ['.','y','.','d','m','r','m','d','d','m','r','m','d','.','y','.'],  # 4  rim highlight
    ['.','y','d','d','m','o','g','o','o','g','o','m','d','d','y','.'],  # 5  lava starts
    ['.','y','d','m','o','g','b','g','g','b','g','o','m','d','y','.'],  # 6
    ['.','y','d','m','o','g','b','w','w','b','g','o','m','d','y','.'],  # 7  lava brightest
    ['.','y','.','d','m','o','g','b','b','g','o','m','d','.','y','.'],  # 8
    ['.','y','.','d','m','o','g','g','g','g','o','m','d','.','y','.'],  # 9
    ['.','.','y','d','m','o','o','g','g','o','o','m','d','y','.','.'],  # 10
    ['.','.','y','.','d','m','o','o','o','o','m','d','.','y','.','.'],  # 11
    ['.','.','.','y','.','d','m','o','o','m','d','.','y','.','.','.'],  # 12
    ['.','.','.','.','y','.','d','m','m','d','.','y','.','.','.','.'],  # 13
    ['.','.','.','.','.','.','d','m','m','d','.','.','.','.','.','.'],  # 14
    ['.','.','.','.','.','.','.','d','d','.','.','.','.','.','.','.'],  # 15 base
]

COLOR_MAP = {
    '.': BLACK,
    'd': MTN_DARK,
    'm': MTN_MID,
    'r': MTN_RIM,
    'o': LAVA_HOT,
    'g': LAVA_GLOW,
    'b': LAVA_BRIGHT,
    'y': YELLOW,
    'w': WHITE,
}

def create_image(size):
    """Create pixel art image at given size (16 or 32)"""
    img = Image.new('RGBA', (size, size), BLACK)

    if size == 16:
        # Use pixel map directly
        for y, row in enumerate(PIXEL_MAP):
            for x, char in enumerate(row):
                img.putpixel((x, y), COLOR_MAP[char])
    else:
        # For 32x32, scale up 2x with nearest neighbor
        scale = size // 16
        for y, row in enumerate(PIXEL_MAP):
            for x, char in enumerate(row):
                color = COLOR_MAP[char]
                for dy in range(scale):
                    for dx in range(scale):
                        img.putpixel((x * scale + dx, y * scale + dy), color)

    return img

def create_apple_touch_icon():
    """Create 180x180 apple touch icon"""
    img = Image.new('RGBA', (180, 180), BLACK)

    # Scale up from 16x16 to 180x180 (11.25x, not perfect integer)
    # Better approach: create at 32x32 then resize
    base = create_image(32)
    # Use NEAREST to keep pixel art crisp
    icon = base.resize((180, 180), Image.NEAREST)
    return icon

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)  # website root

    print("Generating pixel art favicon...")

    # Create images
    img_16 = create_image(16)
    img_32 = create_image(32)
    img_180 = create_apple_touch_icon()

    # Save PNGs
    img_16.save(os.path.join(root_dir, 'favicon-16.png'))
    print("  Saved favicon-16.png")

    img_32.save(os.path.join(root_dir, 'favicon-32.png'))
    print("  Saved favicon-32.png")

    img_180.save(os.path.join(root_dir, 'apple-touch-icon.png'))
    print("  Saved apple-touch-icon.png")

    # Save ICO with multiple sizes
    ico_path = os.path.join(root_dir, 'favicon.ico')
    img_16.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32)])
    print("  Saved favicon.ico (16x16 + 32x32)")

    print("\nDone! Favicon files created in:", root_dir)

if __name__ == '__main__':
    main()
