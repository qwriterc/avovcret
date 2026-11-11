"""BiRefNet (ZhengPeng7/BiRefNet) cut-outs with edge cleanup, white sticker outline, QA sheet."""
import json, sys, numpy as np, torch
from PIL import Image, ImageFilter, ImageDraw
from transformers import AutoModelForImageSegmentation
from torchvision import transforms
PUB = 'public'
KEYS = ['ship', 'skyline', 'toucan']
dev = 'cuda' if torch.cuda.is_available() else 'cpu'
model = AutoModelForImageSegmentation.from_pretrained('ZhengPeng7/BiRefNet', trust_remote_code=True).to(dev).eval()
if dev == 'cuda': model.half()
tf = transforms.Compose([transforms.Resize((1024, 1024)), transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
ok = []; sheet = []
for k in KEYS:
    im = Image.open(f'{PUB}/photos/{k}.jpg').convert('RGB')
    x = tf(im).unsqueeze(0).to(dev)
    if dev == 'cuda': x = x.half()
    with torch.no_grad(): m = model(x)[-1].sigmoid().float().cpu()[0, 0].numpy()
    mask = Image.fromarray((m * 255).astype(np.uint8)).resize(im.size, Image.LANCZOS)
    a = np.asarray(mask).astype(np.float32) / 255
    # clean: remove tiny blobs by thresholding with smoothstep, then erode 1px to kill halos
    a = np.clip((a - 0.35) / 0.4, 0, 1); a = a * a * (3 - 2 * a)
    al = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    cov = float((np.asarray(al) > 127).mean())
    print(k, 'coverage', round(cov, 3))
    rgba = im.convert('RGBA'); rgba.putalpha(al)
    # sticker outline: dilated alpha in white underneath
    w = max(10, im.size[0] // 160)
    big = al.filter(ImageFilter.MaxFilter(2 * (w // 2) * 2 + 1)).filter(ImageFilter.GaussianBlur(1.5))
    out = Image.new('RGBA', im.size, (255, 255, 255, 0)); out.putalpha(big)
    white = Image.new('RGBA', im.size, (255, 255, 255, 255)); white.putalpha(big)
    comp = Image.alpha_composite(white, rgba)
    bb = comp.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    comp = comp.crop(bb)
    comp.thumbnail((1500, 1500), Image.LANCZOS)
    if 0.04 < cov < 0.9:
        comp.save(f'{PUB}/cutouts/{k}.png'); ok.append(k)
    else: print('REJECTED', k)
    bg = Image.new('RGBA', comp.size, (20, 120, 60, 255)); bg.alpha_composite(comp); t = bg.convert('RGB'); t.thumbnail((480, 360)); sheet.append(t)
sh = Image.new('RGB', (480 * len(sheet), 360), 'white')
for i, t in enumerate(sheet): sh.paste(t, (i * 480, 0))
sh.save('qa_cutouts.jpg')
mf = json.load(open(f'{PUB}/manifest.json')); mf['cutouts'] = ok; json.dump(mf, open(f'{PUB}/manifest.json', 'w'), indent=1)
print('cutouts', ok)
