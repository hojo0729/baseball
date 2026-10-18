import sys, math, cv2, numpy as np, bpy, bmesh
from mathutils import Vector
SRC=sys.argv[2]   # 入力画像（extrude/inflate=正面1枚、hull=正面・斜め・真横の3面図）
OUT=sys.argv[1]   # 出力フォルダ（コマ画像 f00.png〜 とテクスチャが出る）
img=cv2.imread(SRC); IH,IW=img.shape[:2]
mask=(img.min(axis=2)<236).astype(np.uint8)*255
mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
cs,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c=max(cs,key=cv2.contourArea)
c=cv2.approxPolyDP(c,1.2,True)[:,0,:]
x0,y0,w,h=cv2.boundingRect(c); print('bbox',x0,y0,w,h,'pts',len(c))
cx,cy=x0+w/2,y0+h/2; s=1.6/h; T=0.22
# texture with white->transparent not needed (outline hides the edge); save as png
cv2.imwrite(OUT+'/tex.png',img)
bpy.ops.wm.read_factory_settings(use_empty=True)
bm=bmesh.new()
vs=[bm.verts.new(((px-cx)*s,0,(cy-py)*s)) for px,py in c]
f=bm.faces.new(vs)
r=bmesh.ops.extrude_face_region(bm,geom=[f])
mv=[g for g in r['geom'] if isinstance(g,bmesh.types.BMVert)]
bmesh.ops.translate(bm,vec=(0,T,0),verts=mv)
bmesh.ops.translate(bm,vec=(0,-T/2,0),verts=list(bm.verts))
bmesh.ops.triangulate(bm,faces=bm.faces[:],quad_method='BEAUTY',ngon_method='EAR_CLIP')
bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:])
uv=bm.loops.layers.uv.new('UV')
g=img.astype(int).sum(axis=2); g[mask==0]=9999
dy,dx=np.unravel_index(np.argmin(g),g.shape); print('dark px',dx,dy,img[dy,dx])
DARK=(dx/IW,1-dy/IH)
for face in bm.faces:
    side=abs(face.normal.y)<0.5
    for l in face.loops:
        if side: l[uv].uv=DARK; continue
        X,Z=l.vert.co.x,l.vert.co.z
        px=X/s+cx; py=cy-Z/s
        l[uv].uv=(px/IW,1-py/IH)
me=bpy.data.meshes.new('cat'); bm.to_mesh(me); bm.free()
ob=bpy.data.objects.new('cat',me); bpy.context.scene.collection.objects.link(ob)
mat=bpy.data.materials.new('m'); mat.use_nodes=True
nt=mat.node_tree; nt.nodes.clear()
tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(OUT+'/tex.png'); tex.interpolation='Linear'
em=nt.nodes.new('ShaderNodeEmission'); outn=nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tex.outputs['Color'],em.inputs['Color']); nt.links.new(em.outputs['Emission'],outn.inputs['Surface'])
ob.data.materials.append(mat)
# background + camera
sc=bpy.context.scene
w=bpy.data.worlds.new('w'); w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.80,0.88,0.95,1); sc.world=w
cam=bpy.data.cameras.new('c'); cam.lens=50; co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co)
co.location=(0,-3.1,0.0); co.rotation_euler=(math.radians(90),0,0); sc.camera=co
sc.render.engine='CYCLES'; sc.cycles.samples=6; sc.cycles.device='CPU'; sc.cycles.use_denoising=False
sc.render.resolution_x=420; sc.render.resolution_y=420
sc.view_settings.view_transform='Standard'
N=32
for i in range(N):
    ob.rotation_euler=(0,0,math.radians(58*math.sin(2*math.pi*i/N)))
    sc.render.filepath=f'{OUT}/f{i:02d}.png'; bpy.ops.render.render(write_still=True)
print('done')
