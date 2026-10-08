(function(root){
 'use strict';
 const names=new Set();
 function register(tables){for(const table of tables)for(const item of table)names.add(item.n);}
 function isMagic(it){
  if(!it)return false;
  if(it.magic===false)return false;
  return it.magic===true||!!it.boneCrown||!!it.cursed||!!it.dexPlus||!!it.plus||names.has(it.n)||['Ring','Scroll','Rod/Staff/Wand','Potion'].includes(it.cat);
 }
 function matches(row,tab){
  if(tab==='all')return true;
  if(tab==='magic')return (row.kind==='potion'&&row.p&&row.p.magic!==false&&row.p.k!=='poison')||(row.kind==='magic'&&isMagic(row.it));
  if(tab==='potion')return row.kind==='potion'||row.kind==='ale';
  if(tab==='supplies')return ['supply','burp','kit'].includes(row.kind);
  if(tab==='materials')return row.kind==='res';
  if(tab==='quest')return !!(row.it&&(row.it.quest||row.it.grondTooth||row.it.cat==='Quest'));
  return row.kind===tab;
 }
 const api={register,isMagic,matches};root.InventoryCategories=api;
 if(typeof module==='object')module.exports=api;
})(globalThis);
