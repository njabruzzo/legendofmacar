(function(root){
 'use strict';
 // This is an allowlist, not a claim that a generic buff implements an item.
 const names=new Set([
  'Ring of Feather Falling','Ring of Fire Resistance','Ring of Free Action','Ring of Invisibility','Ring of Regeneration',
  'Ring of Protection +1','Ring of Protection +2','Ring of Protection +3','Ring of Protection +4 on AC 5 or better',
  'Ring of Dexterity +1','Wand of Magic Missiles',
  'Boots of Elvenkind','Boots of Levitation','Boots of Speed',
  'Cloak of Elvenkind','Cloak of Displacement','Cloak of Protection +1','Cloak of Protection +2','Cloak of Protection +3',
  'Gauntlets of Dexterity','Gauntlets of Ogre Power','Periapt of Health','Periapt of Proof against Poison','Periapt of Wound Closure'
 ]);
 const potionKeys=new Set(['heal','extraheal','heal10','heal20','heal40','healall','poison','longevity','fireres']);
 function available(it){
  if(!it)return false;
  if(names.has(it.n)||it.boneCrown||it.id==='shadow_cleaver')return true;
  if(it.cursed)return false;
  if(/^(Chain Mail|Leather Armor|Plate Mail|Ring Mail|Scale Mail|Splint Mail|Studded Leather|Shield) \+[1-5]$/.test(it.n||''))return true;
  if(/^Shield, large, \+1, \+4 vs missiles$/.test(it.n||''))return true;
  if(/^(Long Sword|Short Sword|Broad Sword|Two-Handed Sword|Axe|Bow|Dagger|Hammer|Javelin|Mace|Sling|Spear|Trident) \+[1-5]$/.test(it.n||''))return true;
  if(/^Long Sword \+1, \+[234] vs /.test(it.n||'')&&it.vs)return true;
  if(it.k==='ammo'&&/^Arrows \+[123] \(\dd\d\)$/.test(it.n||''))return true;
  return false;
 }
 function potionAvailable(it){return !!it&&potionKeys.has(it.k);}
 function select(table,roll){
  const eligible=table.filter(available),total=eligible.reduce((s,it)=>s+it.b-it.a+1,0);
  if(!total)return null;
  let at=Math.min(total-1,Math.max(0,Math.floor(roll*total)));
  for(const it of eligible){const weight=it.b-it.a+1;if(at<weight)return it;at-=weight;}
  return eligible[eligible.length-1];
 }
 const api={available,potionAvailable,select,names};root.MagicItemAvailability=api;
 if(typeof module==='object')module.exports=api;
})(globalThis);
