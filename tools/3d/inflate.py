import sys, math, cv2, numpy as np, bpy
SRC=sys.argv[2]   # 入力画像（extrude/inflate=正面1枚、hull=正面・斜め・真横の3面図）
OUT=sys.argv[1]   # 出力フォルダ（コマ画像 f00.png〜 とテクスチャが出る）
img=cv2.imread(SRC); IH,IW=img.shape[:2]
mask=(img.min(axis=2)<236).astype(np.uint8)*255
mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
cs,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c=max(cs,key=cv2.contourArea); filled=np.zeros_like(mask); cv2.drawContours(filled,[c],-1,255,-1)
# 縁の色を外側へ延ばしたテクスチャ（背景の白が側面に出ないように）
from scipy import ndimage
inner=cv2.erode(filled,np.ones((5,5),np.uint8))>0
ii=ndimage.distance_transform_edt(~inner,return_distances=False,return_indices=True)
pad=img[ii[0],ii[1]]; cv2.imwrite(OUT+'/tex_pad.png',pad)
x0,y0,w,h=cv2.boundingRect(c); PAD=6
x0-=PAD;y0-=PAD;w+=2*PAD;h+=2*PAD
STEP=3
m=filled[y0:y0+h:STEP, x0:x0+w:STEP]; ny,nx=m.shape
dt=cv2.distanceTransform((m>0).astype(np.uint8),cv2.DIST_L2,3)
D=9.0   # inflate radius in grid cells
t=np.clip(dt/D,0,1); H=np.sqrt(1-(1-t)**2)
H=cv2.GaussianBlur(H.astype(np.float32),(0,0),0.8); H[m==0]=0
s=1.6/(h)  # meters per image px
T=0.28
bpy.ops.wm.read_factory_settings(use_empty=True)
verts=[];uvs=[];idx={}
def vid(i,j,side):
    k=(i,j,side)
    if k not in idx:
        px=x0+j*STEP; py=y0+i*STEP
        X=(px-(x0+w/2))*s; Z=((y0+h/2)-py)*s
        Y=-side*H[i,j]*T
        idx[k]=len(verts); verts.append((X,Y,Z)); uvs.append((px/IW,1-py/IH))
    return idx[k]
faces=[]
for i in range(ny-1):
    for j in range(nx-1):
        if H[i:i+2,j:j+2].max()<=0: continue
        a,b,c_,d=(i,j),(i,j+1),(i+1,j+1),(i+1,j)
        # front (side=+1 faces -Y camera): winding so normal toward -Y
        faces.append([vid(*p,1) for p in (a,d,c_,b)])
        faces.append([vid(*p,-1) for p in (a,b,c_,d)])
me=bpy.data.meshes.new('cat'); me.from_pydata(verts,[],faces); me.update()
uvl=me.uv_layers.new(name='UV')
for l in me.loops: uvl.data[l.index].uv=uvs[l.vertex_index]
ob=bpy.data.objects.new('cat',me); bpy.context.scene.collection.objects.link(ob)
bpy.context.view_layer.objects.active=ob; ob.select_set(True)
bpy.ops.object.shade_smooth()
mat=bpy.data.materials.new('m'); mat.use_nodes=True
nt=mat.node_tree; bsdf=nt.nodes['Principled BSDF']
tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(OUT+'/tex_pad.png')
nt.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value=0.75
ob.data.materials.append(mat)
sc=bpy.context.scene
wd=bpy.data.worlds.new('w'); wd.use_nodes=True; wd.node_tree.nodes['Background'].inputs[0].default_value=(0.80,0.88,0.95,1); wd.node_tree.nodes['Background'].inputs[1].default_value=1.0; sc.world=wd
L=bpy.data.lights.new('sun','SUN'); L.energy=2.5; lo=bpy.data.objects.new('sun',L); sc.collection.objects.link(lo); lo.rotation_euler=(math.radians(55),0,math.radians(-35))
cam=bpy.data.cameras.new('c'); cam.lens=50; co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co)
co.location=(0,-3.1,0); co.rotation_euler=(math.radians(90),0,0); sc.camera=co
sc.render.engine='CYCLES'; sc.cycles.samples=24; sc.cycles.device='CPU'; sc.cycles.use_denoising=False
sc.render.resolution_x=420; sc.render.resolution_y=420; sc.view_settings.view_transform='Standard'
N=32
for i in range(N):
    ob.rotation_euler=(0,0,math.radians(60*math.sin(2*math.pi*i/N)))
    sc.render.filepath=f'{OUT}/f{i:02d}.png'; bpy.ops.render.render(write_still=True)
print('done',len(verts),len(faces))
