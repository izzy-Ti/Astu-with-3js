"""
Roof + tree detection from the satellite crops in photos/top_satelite.

Usage:  python -I tools/detect.py <project_root> [debug_dir]

Writes src/data/detected.json with building footprints (map units = full.jpg px) and tree points.
Each zoomed image <n>.jpg is processed in its own pixel space, then mapped into full.jpg space with
the same per-zone affine transform used in src/data/campus.js.
"""
import json, sys, os, math
import cv2
import numpy as np

ROOT = sys.argv[1]
DEBUG = sys.argv[2] if len(sys.argv) > 2 else None
PHOTOS = os.path.join(ROOT, 'photos', 'top_satelite')

TF = {1: (14, 712, 0.282, 0.295), 2: (295, 836, 0.278, 0.29), 3: (543, 843, 0.333, 0.33),
      4: (535, 318, 0.424, 0.4375), 5: (47, 384, 0.433, 0.434), 6: (181, 13, 0.565, 0.55)}

# zone polygons in full.jpg px (same as campus.js) – used to keep one copy where crops overlap
ZONES = {
    6: [[285,150],[655,140],[668,8],[880,70],[905,150],[910,335],[640,338],[540,390],[190,400],[215,340],[250,260]],
    5: [[190,400],[540,390],[546,840],[270,826],[270,716],[85,714],[110,650],[140,560],[165,470]],
    4: [[540,390],[640,338],[910,335],[915,860],[546,842]],
    1: [[85,714],[270,716],[270,826],[385,835],[380,860],[345,960],[290,1045],[200,1010],[10,940],[40,820]],
    2: [[385,835],[546,842],[555,1165],[470,1110],[290,1045],[345,960],[380,860]],
    3: [[546,842],[915,860],[905,1000],[870,1170],[850,1240],[760,1210],[640,1185],[555,1165]],
}
ZONE_NP = {z: np.array(p, np.float32).reshape(-1, 1, 2) for z, p in ZONES.items()}

# regions (full px) where the auto-detector is unreliable and hand-traced data is used instead
EXCLUDE = [
    (775, 855, 925, 1030),   # dark-roof walled compound (zone 3)
    (560, 940, 625, 1010),   # blue triangular hall
    (770, 395, 905, 545),    # stadium
    (700, 440, 770, 515),    # sports courts next to stadium
]


def to_full(z, x, y):
    ox, oy, sx, sy = TF[z]
    return [round(ox + x * sx, 1), round(oy + y * sy, 1)]


def zone_of(pt):
    for z, poly in ZONE_NP.items():
        if cv2.pointPolygonTest(poly, (float(pt[0]), float(pt[1])), False) >= 0:
            return z
    return None


def masks(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    b, g, r = [c.astype(np.int16) for c in cv2.split(img)]
    # transparent/white outside of crop -> ignore
    outside = (v > 245) & (s < 12)
    outside = cv2.dilate(outside.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    gray_roof = (s < 40) & (v > 158) & (np.abs(r - b) < 28) & ~outside
    red_roof = ((h < 12) | (h > 168)) & (s > 80) & (v > 110) & (r - g > 45) & ~outside
    return gray_roof, red_roof, outside


def clean(mask, k=3):
    m = mask.astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k + 2, k + 2), np.uint8))
    return m


def extract(mask, min_area, max_area):
    out = []
    contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hier is None:
        return out
    hier = hier[0]
    for i, c in enumerate(contours):
        if hier[i][3] != -1:      # a hole, handled with its parent
            continue
        area = cv2.contourArea(c)
        if area < min_area or area > max_area:
            continue
        rect = cv2.minAreaRect(c)
        (rw, rh) = rect[1]
        if rw < 4 or rh < 4:
            continue
        rectness = area / (rw * rh)
        aspect = max(rw, rh) / min(rw, rh)
        # biggest hole (courtyard)
        hole, hole_area, j = None, 0, hier[i][2]
        while j != -1:
            a = cv2.contourArea(contours[j])
            if a > hole_area:
                hole_area, hole = a, contours[j]
            j = hier[j][0]
        if hole is not None and hole_area < area * 0.04:
            hole = None
        filled = area + (hole_area if hole is not None else 0)
        if filled / (rw * rh) < 0.55 or aspect > 9:
            continue
        out.append(dict(contour=c, rect=rect, area=area, rectness=filled / (rw * rh), hole=hole))
    return out


def simplify(c, eps_ratio=0.02):
    peri = cv2.arcLength(c, True)
    return cv2.approxPolyDP(c, max(1.5, eps_ratio * peri), True).reshape(-1, 2)


def process_zone(z):
    img = cv2.imread(os.path.join(PHOTOS, f'{z}.jpg'))
    gray, red, outside = masks(img)
    scale = 1 / TF[z][2]                  # crop px per map px
    min_area = (3.5 * scale) ** 2         # ~ 3.5x3.5 map px
    max_area = (75 * scale) ** 2
    found = []
    for kind, m in (('gray', clean(gray)), ('red', clean(red))):
        for f in extract(m, min_area, max_area):
            f['color'] = kind
            found.append(f)

    results = []
    dbg = img.copy() if DEBUG else None
    for f in found:
        rect = f['rect']
        box = cv2.boxPoints(rect)
        # rectangular enough -> clean oriented box, else simplified polygon
        if f['rectness'] > 0.8 and f['hole'] is None:
            pts = box
        elif f['hole'] is not None and f['rectness'] > 0.72:
            pts = box
        else:
            pts = simplify(f['contour'])
            if len(pts) < 3:
                pts = box
        poly = [to_full(z, float(x), float(y)) for x, y in pts]
        hole = None
        if f['hole'] is not None:
            hr = cv2.minAreaRect(f['hole'])
            hp = cv2.boxPoints(hr) if cv2.contourArea(f['hole']) / max(1, hr[1][0] * hr[1][1]) > 0.7 else simplify(f['hole'], 0.03)
            hole = [to_full(z, float(x), float(y)) for x, y in hp]
        cx, cy = to_full(z, *rect[0])
        m = np.zeros(img.shape[:2], np.uint8)
        cv2.drawContours(m, [f['contour']], -1, 255, -1)
        if f['hole'] is not None:
            cv2.drawContours(m, [f['hole']], -1, 0, -1)
        bgr = cv2.mean(img, mask=m)[:3]
        roof_hex = '#%02x%02x%02x' % (int(bgr[2]), int(bgr[1]), int(bgr[0]))
        results.append(dict(zone=z, color=f['color'], roofColor=roof_hex, poly=poly, hole=hole, center=[cx, cy],
                            areaMap=round(f['area'] / scale / scale, 1),
                            angle=round(rect[2], 1)))
        if dbg is not None:
            cv2.polylines(dbg, [np.int32(pts)], True, (0, 255, 255) if f['color'] == 'gray' else (255, 0, 255), 2)
            if f['hole'] is not None:
                cv2.drawContours(dbg, [f['hole']], -1, (0, 128, 255), 1)
    if dbg is not None:
        cv2.imwrite(os.path.join(DEBUG, f'det_{z}.jpg'), dbg)
    return results


def main():
    all_b = []
    for z in TF:
        for b in process_zone(z):
            cz = zone_of(b['center'])
            if cz != z:           # keep the copy from the crop that "owns" this location
                continue
            if any(x0 <= b['center'][0] <= x1 and y0 <= b['center'][1] <= y1 for x0, y0, x1, y1 in EXCLUDE):
                continue
            all_b.append(b)

    # trees: dark, slightly green pixels in full.jpg
    full = cv2.imread(os.path.join(PHOTOS, 'full.jpg'))
    hsv = cv2.cvtColor(full, cv2.COLOR_BGR2HSV)
    v = hsv[..., 2].astype(np.int16)
    b_, g_, r_ = [c.astype(np.int16) for c in cv2.split(full)]
    blur_v = cv2.GaussianBlur(v.astype(np.float32), (0, 0), 1.2)
    canopy = (blur_v < 78) & (g_ >= b_ - 4) & (v > 8)
    purple = (r_ > g_ + 8) & (b_ > g_ + 4) & (v < 140) & (v > 50)
    rng = np.random.default_rng(7)
    trees = []
    step = 5
    H, W = v.shape
    for y in range(0, H, step):
        for x in range(0, W, step):
            jx, jy = x + rng.uniform(0, step), y + rng.uniform(0, step)
            ix, iy = min(W - 1, int(jx)), min(H - 1, int(jy))
            if not (canopy[iy, ix] or purple[iy, ix]):
                continue
            if zone_of((jx, jy)) is None:
                continue
            # local darkness -> size
            d = float(blur_v[iy, ix])
            r = round(float(np.clip(1.8 + (78 - d) / 22 + rng.uniform(-0.4, 0.8), 1.6, 4.6)), 1)
            kind = 'p' if purple[iy, ix] and not canopy[iy, ix] else 'g'
            trees.append([round(jx, 1), round(jy, 1), r, kind])

    out = dict(source='photos/top_satelite (auto-detected, tools/detect.py)', buildings=all_b, trees=trees)
    dest = os.path.join(ROOT, 'src', 'data', 'detected.json')
    with open(dest, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    print('buildings', len(all_b), 'trees', len(trees), '->', dest)
    by_zone = {}
    for b in all_b:
        by_zone[b['zone']] = by_zone.get(b['zone'], 0) + 1
    print('per zone', dict(sorted(by_zone.items())))


if __name__ == '__main__':
    main()
