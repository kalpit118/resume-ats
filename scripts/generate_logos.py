import os
import cv2
import numpy as np

def generate_logo_assets():
    source_img_path = 'ResumeFit_Logo.original.png'
    if not os.path.exists(source_img_path):
        source_img_path = 'ResumeFit_Logo.png'

    img = cv2.imread(source_img_path)
    if img is None:
        raise FileNotFoundError(f"Could not load source image from {source_img_path}")

    h_orig, w_orig = img.shape[:2]

    # Detect bounding box of non-white content
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = gray < 248
    coords = np.argwhere(mask)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)

    # 12px padding around content
    pad = 12
    y0 = max(0, y0 - pad)
    y1 = min(h_orig, y1 + pad)
    x0 = max(0, x0 - pad)
    x1 = min(w_orig, x1 + pad)

    crop = img[y0:y1, x0:x1].astype(np.float32)
    ch, cw = crop.shape[:2]

    # Background color estimation
    bg_color = np.array([254.0, 254.0, 254.0], dtype=np.float32)
    diff = np.maximum(0, bg_color - crop)
    max_diff = np.max(diff, axis=2)
    alpha = np.clip(max_diff / 231.0, 0.0, 1.0)
    alpha[alpha < 0.015] = 0.0

    # Unpremultiply foreground color for clean edges
    fg_light = np.zeros_like(crop)
    valid = alpha > 0.001
    for c in range(3):
        fg_light[valid, c] = np.clip(
            (crop[valid, c] - (1.0 - alpha[valid]) * bg_color[c]) / alpha[valid],
            0,
            255
        )

    # Blue mask (in BGR: B channel >> R channel)
    is_blue = (fg_light[:, :, 0] - fg_light[:, :, 2]) > 40

    # Dark mode: Invert dark text/mark to white, preserve vibrant accessible blue
    fg_dark = np.zeros_like(crop)
    fg_dark[is_blue] = [254, 127, 43] # Vibrant blue in BGR (#2b7fff)
    fg_dark[~is_blue] = [255, 255, 255] # Pure white

    # Construct RGBA images
    full_light = np.zeros((ch, cw, 4), dtype=np.uint8)
    full_light[:, :, :3] = np.round(fg_light).astype(np.uint8)
    full_light[:, :, 3] = np.round(alpha * 255).astype(np.uint8)

    full_dark = np.zeros((ch, cw, 4), dtype=np.uint8)
    full_dark[:, :, :3] = np.round(fg_dark).astype(np.uint8)
    full_dark[:, :, 3] = np.round(alpha * 255).astype(np.uint8)

    # Square Icon mark (document + checkmark only)
    col_alpha = np.max(alpha, axis=0)
    gap_start = 210
    gap_end = 280
    min_col = np.argmin(col_alpha[gap_start:gap_end]) + gap_start
    icon_w = min_col

    icon_light_raw = full_light[:, :icon_w]
    icon_dark_raw = full_dark[:, :icon_w]

    icon_mask = icon_light_raw[:, :, 3] > 10
    iy, ix = np.argwhere(icon_mask).T
    iy0, iy1 = iy.min(), iy.max()
    ix0, ix1 = ix.min(), ix.max()

    icon_h = iy1 - iy0 + 1
    icon_w_tight = ix1 - ix0 + 1
    side = max(icon_h, icon_w_tight) + 24

    sq_light = np.zeros((side, side, 4), dtype=np.uint8)
    sq_dark = np.zeros((side, side, 4), dtype=np.uint8)

    oy = (side - icon_h) // 2
    ox = (side - icon_w_tight) // 2
    sq_light[oy:oy+icon_h, ox:ox+icon_w_tight] = icon_light_raw[iy0:iy1+1, ix0:ix1+1]
    sq_dark[oy:oy+icon_h, ox:ox+icon_w_tight] = icon_dark_raw[iy0:iy1+1, ix0:ix1+1]

    os.makedirs('public', exist_ok=True)
    os.makedirs('src/assets', exist_ok=True)

    # Save to public
    cv2.imwrite('public/ResumeFit_Logo.png', full_light)
    cv2.imwrite('public/ResumeFit_Logo_Light.png', full_light)
    cv2.imwrite('public/ResumeFit_Logo_Dark.png', full_dark)
    cv2.imwrite('public/ResumeFit_Icon.png', sq_light)
    cv2.imwrite('public/ResumeFit_Icon_Dark.png', sq_dark)

    # Save to src/assets
    cv2.imwrite('src/assets/ResumeFit_Logo.png', full_light)
    cv2.imwrite('src/assets/ResumeFit_Logo_Light.png', full_light)
    cv2.imwrite('src/assets/ResumeFit_Logo_Dark.png', full_dark)
    cv2.imwrite('src/assets/ResumeFit_Icon.png', sq_light)
    cv2.imwrite('src/assets/ResumeFit_Icon_Dark.png', sq_dark)

    print(f"Generated logo assets ({cw}x{ch}) and square icons ({side}x{side}) successfully!")

if __name__ == '__main__':
    generate_logo_assets()
