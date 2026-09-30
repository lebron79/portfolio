import sys, glob, os
from PIL import Image, ImageDraw

files = sorted(glob.glob(sys.argv[1]))
out = sys.argv[2]
W, H, cols = 480, 300, 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, (H + 20) * rows), 'white')
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB')
    im.thumbnail((W, H))
    x, y = (i % cols) * W, (i // cols) * (H + 20)
    sheet.paste(im, (x, y + 20))
    d.text((x + 4, y + 4), os.path.basename(f), fill='black')
sheet.save(out)
