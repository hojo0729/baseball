import sys, math, cv2, numpy as np, bpy
from scipy import ndimage
from skimage.measure import marching_cubes
SRC=sys.argv[2]   # 入力画像（extrude/inflate=正面1枚、hull=正面・斜め・真横の3面図）
OUT=sys.argv[1]   # 出力フォルダ（コマ画像 f00.png〜 とテクスチャが出る）
img=cv2.imread(SRC); IH,IW=img.shape[:2]
mask=(img.min(axis=2)<236).astype(np.uint8)*255
mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
dil=cv2.dilate(mask,np.ones((15,15),np.uint8))
n,lab,st,_=cv2.connectedComponentsWithStats(dil)
comps=sorted([i for i in range(1,n) if st[i,4]>8000],key=lambda i:st[i,0])
print('components',[tuple(st[i][:4]) for i in comps])
def crop(i):
    x,y,w,h=st[i][:4]
    m=(lab[y:y+h,x:x+w]==i)&(mask[y:y+h,x:x+w]>0)
    # fill holes
    m=ndimage.binary_fill_holes(m)
    return img[y:y+h,x:x+w].copy(), m.astype(np.uint8)
Fi,Fm=crop(comps[0]); Si,Sm=crop(comps[-1])
Hf=Fi.shape[0]
# 横図の高さを正面図に合わせる
Hs,Ws=Si.shape[:2]; k=Hf/Hs
Si=cv2.resize(Si,(int(Ws*k),Hf),interpolation=cv2.INTER_AREA); Sm=(cv2.resize(Sm,(int(Ws*k),Hf),interpolation=cv2.INTER_NEAREST)>0).astype(np.uint8)
print('front',Fi.shape,'side',Si.shape,'height ratio',k)
f=2
Fz=cv2.resize(Fm,(Fm.shape[1]//f,Hf//f),interpolation=cv2.INTER_AREA)>0.5
Sz=cv2.resize(Sm,(Sm.shape[1]//f,Hf//f),interpolation=cv2.INTER_AREA)>0.5
Fz=Fz[::-1]; Sz=Sz[::-1]   # z=0 が足元
V=Fz.T[:,None,:] & Sz.T[None,:,:]       # [x, y, z]
print('voxels',V.shape,int(V.sum()))
pad=3; Vp=np.pad(V.astype(np.float32),pad); Vs=ndimage.gaussian_filter(Vp,1.7)
verts,faces,normals,_=marching_cubes(Vs,0.5)
print('mesh',len(verts),len(faces))
nz=Fz.shape[0]
cxi=np.median(np.where(Fz[nz//3:].any(axis=0))[0]); cyi=np.median(np.where(Sz[nz//3:].any(axis=0))[0])
s=1.6/nz
vx,vy,vz=(verts[:,0]-pad),(verts[:,1]-pad),(verts[:,2]-pad)
W=np.stack([(vx-cxi)*s,(vy-cyi)*s,vz*s-0.8],1)
Nw=normals
# 色：正面・側面の絵から投影
def samp(im,col,row):
    col=np.clip(np.round(col).astype(int),0,im.shape[1]-1); row=np.clip(np.round(row).astype(int),0,im.shape[0]-1)
    return im[row,col][:,::-1]/255.0   # BGR->RGB
rowf=(nz-1-vz)*f
Cf=samp(Fi,vx*f,rowf); Cs=samp(Si,vy*f,rowf)
wf=np.clip(-Nw[:,1]-0.12,0,1)**4+1e-3; wb=np.clip(Nw[:,1]-0.12,0,1)**4*0.6; ws=np.clip(np.abs(Nw[:,0])-0.12,0,1)**4*1.0+np.clip(Nw[:,2],0,1)**3*0.2
col=(Cf*(wf+wb)[:,None]+Cs*ws[:,None])/((wf+wb+ws)[:,None])
col=np.where(col<=0.04045,col/12.92,((col+0.055)/1.055)**2.4)
# 画像の向き: 正面の列は右向き=+x。横図は左が顔=forward(-Y)なので列方向=+Y（後ろ）
# blender: x→x, y→y, z→z
bpy.ops.wm.read_factory_settings(use_empty=True)
me=bpy.data.meshes.new('hull')
me.from_pydata([tuple(v) for v in W],[],[tuple(t[::-1]) for t in faces]); me.update()
ca=me.color_attributes.new('Col','FLOAT_COLOR','POINT')
for i,c in enumerate(col): ca.data[i].color=(c[0],c[1],c[2],1)
ob=bpy.data.objects.new('hull',me); sc=bpy.context.scene; sc.collection.objects.link(ob)
bpy.context.view_layer.objects.active=ob; ob.select_set(True); bpy.ops.object.shade_smooth()
mat=bpy.data.materials.new('m'); mat.use_nodes=True; nt=mat.node_tree
b=nt.nodes['Principled BSDF']; at=nt.nodes.new('ShaderNodeAttribute'); at.attribute_name='Col'
nt.links.new(at.outputs['Color'],b.inputs['Base Color']); b.inputs['Roughness'].default_value=0.8
ob.data.materials.append(mat)
wd=bpy.data.worlds.new('w'); wd.use_nodes=True; wd.node_tree.nodes['Background'].inputs[0].default_value=(0.80,0.88,0.95,1); wd.node_tree.nodes['Background'].inputs[1].default_value=1.0; sc.world=wd
L=bpy.data.lights.new('sun','SUN'); L.energy=2.5; lo=bpy.data.objects.new('sun',L); sc.collection.objects.link(lo); lo.rotation_euler=(math.radians(55),0,math.radians(-35))
cam=bpy.data.cameras.new('c'); cam.lens=50; co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co)
co.location=(0,-3.4,0); co.rotation_euler=(math.radians(90),0,0); sc.camera=co
sc.render.engine='CYCLES'; sc.cycles.samples=16; sc.cycles.device='CPU'; sc.cycles.use_denoising=False
sc.render.resolution_x=420; sc.render.resolution_y=420; sc.view_settings.view_transform='Standard'
N=36
for i in range(N):
    ob.rotation_euler=(0,0,math.radians(360*i/N))
    sc.render.filepath=f'{OUT}/f{i:02d}.png'; bpy.ops.render.render(write_still=True)
print('done')
