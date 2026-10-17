#!/usr/bin/env python3
"""BVH (CMU mocap) -> joint world positions used by the game (pelvis, neck, head, shoulders, elbows, hands, hips, knees, feet).
usage: python3 tools/bvh-joints.py file.bvh  -> prints JSON {fps, names, frames:[[x,y,z]*15]} in metres (y up)"""
import sys, json, math
import numpy as np

def parse(path):
    toks = open(path).read().split()
    i = 0; joints = []; stack = []
    while toks[i] != 'MOTION':
        t = toks[i]
        if t in ('ROOT', 'JOINT'):
            j = {'name': toks[i + 1], 'parent': stack[-1] if stack else -1, 'off': None, 'ch': []}
            joints.append(j); i += 2
        elif t == 'End':
            joints.append({'name': joints[stack[-1]]['name'] + '_end', 'parent': stack[-1], 'off': None, 'ch': []}); i += 2
        elif t == '{': stack.append(len(joints) - 1); i += 1
        elif t == '}': stack.pop(); i += 1
        elif t == 'OFFSET': joints[stack[-1]]['off'] = np.array([float(x) for x in toks[i + 1:i + 4]]); i += 4
        elif t == 'CHANNELS':
            n = int(toks[i + 1]); joints[stack[-1]]['ch'] = toks[i + 2:i + 2 + n]; i += 2 + n
        else: i += 1
    i += 1
    nf = int(toks[i + 1]); ft = float(toks[i + 4]); i += 5
    nch = sum(len(j['ch']) for j in joints)
    data = np.array([float(x) for x in toks[i:i + nf * nch]]).reshape(nf, nch)
    return joints, data, ft

def rot(axis, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    if axis == 'X': return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'Y': return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def fk(joints, row):
    pos = []; R = []; k = 0
    for j in joints:
        t = j['off'].copy(); M = np.eye(3)
        for c in j['ch']:
            v = row[k]; k += 1
            if c.endswith('position'): t['XYZ'.index(c[0])] = v if j['parent'] < 0 else t['XYZ'.index(c[0])]
            else: M = M @ rot(c[0], v)
        if j['parent'] < 0: p = t; Rw = M
        else: p = pos[j['parent']] + R[j['parent']] @ t; Rw = R[j['parent']] @ M
        pos.append(p); R.append(Rw)
    return pos

NAMES = ['pelvis', 'neck', 'head', 'sL', 'sR', 'eL', 'eR', 'hL', 'hR', 'hipL', 'hipR', 'kL', 'kR', 'fL', 'fR']
SRC = ['Hips', 'Neck', 'Head', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand',
       'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot']
if __name__ == '__main__':
    joints, data, ft = parse(sys.argv[1])
    idx = [[j['name'] for j in joints].index(n) for n in SRC]
    frames = []
    for row in data:
        P = fk(joints, row)
        frames.append([[round(float(c), 4) for c in P[i]] for i in idx])
    json.dump({'fps': round(1 / ft), 'names': NAMES, 'frames': frames}, sys.stdout)
