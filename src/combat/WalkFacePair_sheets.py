#!/usr/bin/env python3
"""w1/w2 must share a facing. w2 is not a horizontal flip of w1."""
from pathlib import Path
from PIL import Image
import numpy as np
import sys

root=Path(__file__).resolve().parents[2]
failed=0

def assert_(cond, msg):
    global failed
    if not cond:
        failed+=1
        print('FAIL  '+msg)
    else:
        print('ok    '+msg)

def mask(path, size=(96,128)):
    im=Image.open(path).convert('RGBA').resize(size, Image.Resampling.BILINEAR)
    a=np.array(im)
    return (a[:,:,3]>40).astype(np.float32)

def corr(a,b):
    a=a-a.mean(); b=b-b.mean()
    d=(np.sqrt((a**2).sum())*np.sqrt((b**2).sum())) or 1.0
    return float((a*b).sum()/d)

def check_pair(a_name, b_name, label):
    a=root/'assets'/'creatures'/a_name
    b=root/'assets'/'creatures'/b_name
    assert_(a.is_file() and b.is_file(), label+': both sheets on disk')
    ma,mb=mask(a),mask(b)
    same=corr(ma,mb)
    flipped=corr(np.fliplr(ma), mb)
    assert_(same>flipped, f'{label}: unflipped pair matches more than a mirror ({same:.3f}>{flipped:.3f})')
    assert_(flipped<0.55, f'{label}: w2 is not a painted mirror of w1 (flip corr {flipped:.3f})')
    assert_(same>0.55, f'{label}: w1/w2 share a silhouette / camera (corr {same:.3f})')

check_pair('dwarf_macar_e_w1.png','dwarf_macar_e_w2.png','east D-walk')
check_pair('dwarf_macar_w1.png','dwarf_macar_w2.png','front plant')

if failed:
    print(f'\n{failed} failed')
    sys.exit(1)
