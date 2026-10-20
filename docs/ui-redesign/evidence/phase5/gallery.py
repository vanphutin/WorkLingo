"""Contact sheets of real captures for inspection; original PNGs stay unchanged."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)

for theme in ['light', 'dark']:
    captures = sorted((ROOT / 'regression').glob(f'slice-*/*-{theme}-1440.png'))
    for offset in range(0, len(captures), 6):
        sheet = Image.new('RGB', (1080, 990), '#e8e8ed')
        draw = ImageDraw.Draw(sheet)
        for index, file in enumerate(captures[offset:offset + 6]):
            source = Image.open(file).convert('RGB')
            preview = source.crop((0, 0, source.width, min(1200, source.height)))
            preview.thumbnail((530, 290))
            x, y = (index % 2) * 540, (index // 2) * 330
            draw.text((x + 8, y + 4), file.stem.replace('production-', '')[:57], fill='#17171a', font=FONT)
            sheet.paste(preview, (x + 5, y + 34))
        sheet.save(ROOT / f'contact-{theme}-{offset // 6 + 1}.png')

for name, bounds in [('admin-operations-light-390', (0, 900, 390, 1600)), ('admin-content-light-1440', (305, 120, 1420, 520))]:
    crops = [Image.open(ROOT / directory / f'{name}.png').convert('RGB').crop(bounds) for directory in ['before-visual', 'after']]
    width, height = crops[0].size
    comparison = Image.new('RGB', (width * 2 + 12, height + 36), '#e8e8ed')
    draw = ImageDraw.Draw(comparison)
    for index, crop in enumerate(crops):
        draw.text((index * (width + 12) + 8, 8), 'BEFORE' if index == 0 else 'AFTER', fill='#17171a', font=FONT)
        comparison.paste(crop, (index * (width + 12), 36))
    comparison.save(ROOT / f'comparison-{name}.png')
