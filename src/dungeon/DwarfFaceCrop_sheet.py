#!/usr/bin/env python3
"""Pixel checks for the cropped ruby-door dwarf-face sheet."""
import sys
from PIL import Image
import numpy as np

im=Image.open(sys.argv[1]).convert('RGBA')
a=np.array(im)
alpha=a[:,:,3]
gray=a[:,:,:3].astype(np.float32).mean(axis=2)
h,w=alpha.shape
opq=alpha>40
print('opaque', float(opq.mean()))
print('clear', float((alpha==0).mean()))
y0,y1=int(h*0.32), int(h*0.50)
x0,x1=int(w*0.34), int(w*0.66)
band=gray[y0:y1, x0:x1]
mask=opq[y0:y1, x0:x1]
print('mouth_opaque', float(mask.mean()))
print('mouth_dark', float((band[mask]<55).mean()) if mask.any() else 0)
print('binary', int(((alpha==0)|(alpha==255)).mean()>0.98))
