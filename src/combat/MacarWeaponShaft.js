(function(root){
 'use strict';
 // Visible shaft endpoints: centre of the pommel and the head's socket.
 // Coordinates are normalized to the decoded pose, NOT its opaque bounds.
 // Hands may occlude the middle; they never shorten the actual shaft.
 const target={maul:.53,axe:.65};
 const folder='assets/creatures/shafts/';
 const replacements={
  'dwarf_macar_w1.png':'maul_walk_s_1.png',
  'dwarf_macar_w2.png':'maul_walk_s_2.png',
  'dwarf_macar_e_w1.png':'maul_walk_e_1.png',
  'dwarf_macar_e_w2.png':'maul_walk_e_2.png',
  'dwarf_macar_back_w1.png':'maul_walk_n_1.png',
  'dwarf_macar_back_w2.png':'maul_walk_n_2.png',
  'dwarf_macar_atk_contact.png':'maul_attack_e.png',
  'dwarf_macar_atk_s.png':'maul_attack_s.png',
  'dwarf_macar_atk_se.png':'maul_attack_se.png',
  'dwarf_macar_idle_maul_v2.png':'maul_idle.png',
  'dwarf_macar_idle_axe_v2.png':'axe_idle.png',
  'dwarf_macar_idle_axe_s_v3.png':'axe_idle_s.png',
  'dwarf_macar_axe_atk_v2.png':'axe_attack.png'
 };
 function record(weapon,w,h,shaft,foot,body,brow){
  return {weapon,size:[w,h],shaft:[[shaft[0]/w,shaft[1]/h],[shaft[2]/w,shaft[3]/h]],
   foot:[foot[0]/w,foot[1]/h],body:[body[0]/h,body[1]/h],brow:[brow[0]/w,brow[1]/h,brow[2]/w,brow[3]||0]};
 }
 const singles={
  macar:record('maul',508,880,[27,384,329,252],[250,856],[245,856],[232,279,86,0]),
  macar_w1:record('maul',955,1647,[234,1167,233,562],[475,1615],[452,1615],[452,515,166,0]),
  macar_w2:record('maul',962,1635,[240,1155,235,568],[472,1601],[445,1601],[461,515,166,0]),
  macar_e_w1:record('maul',977,1610,[755,948,302,718],[404,1574],[610,1574],[500,663,131,.04]),
  macar_e_w2:record('maul',973,1617,[745,937,305,715],[396,1563],[594,1563],[485,651,131,.04]),
  macar_back_w1:record('maul',932,1688,[740,1048,730,439],[448,1584],[398,1584],[411,459,146,0]),
  macar_back_w2:record('maul',935,1683,[794,1118,779,451],[446,1570],[355,1570],[414,412,146,0]),
  macar_idle_n:record('maul',932,1688,[735,1095,719,425],[448,1580],[375,1580],[412,423,146,0]),
  macar_atk_contact:record('maul',1254,1254,[571,935,966,731],[443,1200],[547,1200],[569,591,129,.12]),
  macar_atk_s:record('maul',864,1821,[271,962,267,1555],[425,1778],[738,1778],[213,828,132,-.20]),
  macar_atk_se:record('maul',1033,1522,[272,938,683,1198],[383,1416],[585,1416],[654,663,142,.28]),
  macar_atk_n:record('maul',463,880,[231,365,231,125],[231,878],[381,878],[231,413,83,0]),
  macar_atk_ne:record('maul',727,880,[374,615,585,420],[240,856],[354,856],[308,384,81,-.08]),
  macar_axe:record('axe',1280,1280,[319,389,949,228],[626,1220],[185,1220],[616,252,135,0]),
  macar_axe_atk:record('axe',1280,1280,[600,929,1053,603],[434,1202],[513,1202],[588,566,136,.12])
  ,macar_axe_idle_n:record('axe',1207,1303,[1007,430,407,245],[638,1238],[173,1238],[593,210,158,0])
 };
 const idle={
  maul:{
   s:record('maul',512,512,[110,164,322,83],[251,500],[63,500],[251,89,61,0]),
   e:record('maul',512,512,[423,201,192,119],[269,500],[65,500],[281,87,57,.03]),
   se:record('maul',512,512,[87,182,281,95],[255,502],[71,502],[239,98,62,.06]),
   n:record('maul',512,512,[444,348,380,118],[255,491],[38,491],[252,69,62,0]),
   ne:record('maul',512,512,[431,179,235,112],[286,492],[50,492],[288,82,57,.03])
  },
  axe:{
   e:record('axe',512,512,[427,198,178,126],[269,500],[66,500],[281,87,57,.03]),
   se:record('axe',512,512,[77,180,306,94],[255,502],[72,502],[239,98,62,.06]),
   n:record('axe',512,512,[466,403,404,144],[255,491],[47,491],[252,83,62,0]),
   ne:record('axe',512,512,[462,181,218,132],[286,492],[57,492],[288,96,57,.03])
  }
 };
 function cycle(view,phase){
  const front=view==='front';
  const ends=front?[[108,205,427,92],[110,200,426,91],[107,219,430,113],[108,216,433,108]]:
   [[509,205,204,99],[510,205,205,99],[508,216,204,111],[511,215,205,109]];
  const bases=front?[604,602,593,592]:[604,604,597,597],centers=front?[294,300,293,297]:[305,305,305,305];
  const scale=360/(bases[phase]-85),b=bases[phase],cx=centers[phase],p=ends[phase];
  const x=v=>256+(v-cx)*scale,y=v=>512+(v-b)*scale;
  return record('axe',512,512,[x(p[0]),y(p[1]),x(p[2]),y(p[3])],[256,512],[152,512],[256,152,78*scale,0]);
 }
 function pose(key){
  if(key==='macar_atk')return singles.macar_atk_contact;
  if(key==='macar_axe_idle_s')return singles.macar_axe;
  if(key==='macar_axe_w1'||key==='macar_axe_w2')return cycle('front',key.endsWith('w1')?0:2);
  if(/^macar_(?:se|ne)_w[12]$/.test(key||''))return singles['macar_e_'+key.slice(-2)];
  if(singles[key])return singles[key];
  const i=/^macar(?:_(axe))?_idle_(s|e|se|n|ne)$/.exec(key||'');
  if(i)return idle[i[1]||'maul'][i[2]]||null;
  const m=/^macar_axe_cycle_(front|rear)_([0-3])$/.exec(key||'');
  return m?cycle(m[1],+m[2]):null;
 }
 function register(bindings){
  for(const key of Object.keys(bindings)){
   const name=bindings[key].split('/').pop();if(replacements[name])bindings[key]=folder+replacements[name];
  }
  // The anchor lock binds these outside MACAR_ONMODEL's declaration.
  bindings.macar_atk=bindings.macar_atk_contact=folder+'maul_attack_e.png';
  // Cold-loading fallback pairs must use the same real axe as the cycle.
  if(bindings.macar_axe_w1)bindings.macar_axe_w1='assets/creatures/pilots/macar-axe-walk-front-v9.png';
  if(bindings.macar_axe_w2)bindings.macar_axe_w2='assets/creatures/pilots/macar-axe-walk-front-v9.png';
  for(const d of ['se','ne'])for(const f of [1,2])if(bindings['macar_e_w'+f])bindings['macar_'+d+'_w'+f]=bindings['macar_e_w'+f];
  bindings.macar_idle_n=folder+'maul_idle_n.png';
  bindings.macar_axe_idle_n=folder+'axe_idle_n.png';
 }
 function standalone(key){return key==='macar_idle_n'||key==='macar_axe_idle_n';}
 function metrics(key,image){
  const p=pose(key);if(!p||!image||!image.width||!image.height)return null;
  const a=p.shaft[0],b=p.shaft[1],w=image.width,h=image.height;
  const shaft=Math.hypot((b[0]-a[0])*w,(b[1]-a[1])*h);
  return {weapon:p.weapon,shaft,body:(p.body[1]-p.body[0])*h,target:target[p.weapon]};
 }
 function fit(key,image){const m=metrics(key,image);return m&&m.shaft>0?m.target*image.height/m.shaft:0;}
 function prepare(image,key){
  const p=pose(key);if(!p||!image||!image.width)return image;
  image.__macarIdleSeat=[p.brow[0]*image.width,p.brow[1]*image.height,p.brow[2]*image.width,p.brow[3]];
  // Newly generated single poses already have their native transparent
  // cutout. Do not send them through the old matte-reconstruction routine.
  if(String(image.src||'').includes('/shafts/'))image.__macarDirectionalIdle=1;
  image._stature=p.body[1]-p.body[0];return image;
 }
 const api={target,replacements,singles,idle,cycle,pose,register,standalone,metrics,fit,prepare};
 root.MacarWeaponShaft=api;if(typeof module==='object')module.exports=api;
})(globalThis);
