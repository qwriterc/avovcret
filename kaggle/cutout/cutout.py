# BiRefNet (ZhengPeng7/BiRefNet) background removal. GPU job.
import os, subprocess, sys, glob
subprocess.check_call([sys.executable,"-m","pip","install","-q","timm","kornia","einops","scipy"])
import torch, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from transformers import AutoModelForImageSegmentation
from torchvision import transforms
dev = "cuda" if torch.cuda.is_available() else "cpu"
model = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True, low_cpu_mem_usage=False).to(dev).eval().half() if dev=="cuda" else None
tf = transforms.Compose([transforms.Resize((1024,1024)), transforms.ToTensor(), transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])
files = sorted(glob.glob("/kaggle/input/**/p[0-9][0-9].jpg", recursive=True)); print(files[:3], len(files))
os.makedirs("/kaggle/working/cut", exist_ok=True)
for f in files:
    name = os.path.basename(f)[:-4]
    im = Image.open(f).convert("RGB")
    x = tf(im).unsqueeze(0).to(dev).half()
    with torch.no_grad(): pred = model(x)[-1].sigmoid().float().cpu()[0,0].numpy()
    a = np.array(Image.fromarray((pred*255).astype(np.uint8)).resize(im.size, Image.BICUBIC)).astype(np.float32)/255
    # clean edges: harden slightly, erode 1px, feather 0.7px (no halos)
    a = np.clip((a-0.08)/0.84, 0, 1)
    a = ndi.grey_erosion(a, size=(3,3))
    a = ndi.gaussian_filter(a, 0.7)
    rgb = np.array(im).astype(np.float32)
    # decontaminate: replace colors at the edge by colors from interior
    inner = a > 0.98
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    fg = rgb[idx[0], idx[1]]
    w = np.clip((a-0.5)/0.5,0,1)[...,None]
    rgb2 = rgb*w + fg*(1-w)
    out = np.dstack([rgb2.astype(np.uint8), (a*255).astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(f"/kaggle/working/cut/{name}.png")
    print("done", name, flush=True)
