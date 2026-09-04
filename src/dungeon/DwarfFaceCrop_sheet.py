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
ys,xs=np.where(opq)
if len(xs):
    bw=int(xs.max()-xs.min()+1); bh=int(ys.max()-ys.min()+1)
    print('content_aspect', bw/bh)
else:
    print('content_aspect', 0)
y0,y1=int(h*0.42), int(h*0.58)
x0,x1=int(w*0.34), int(w*0.66)
hole=alpha[y0:y1, x0:x1]==0
print('mouth_clear', float(hole.mean()))
print('mouth_opaque', float((alpha[y0:y1, x0:x1]>40).mean()))
print('binary', int(((alpha==0)|(alpha==255)).mean()>0.98))
