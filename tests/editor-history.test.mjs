import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorHistory } from '../src/editor-history.js';
test('scene history restores imported scenes and discards redo after a fresh edit',()=>{
  const original={floors:[{id:'old',objects:[]}]};const history=new EditorHistory(original);
  const imported={floors:[{id:'new',objects:[{id:'chair',x:50}]}]};history.commit(imported);imported.floors[0].objects[0].x=90;
  assert.deepEqual(history.undo(),original);
  assert.equal(history.redo().floors[0].objects[0].x,50);
  history.undo();history.commit({floors:[]});assert.equal(history.redo(),null);
});
test('history ignores unchanged host echoes and bounds undo memory',()=>{
  const history=new EditorHistory({title:'a'},2);history.commit({title:'a'});assert.equal(history.past.length,0);
  history.commit({title:'b'});history.commit({title:'c'});history.commit({title:'d'});
  assert.deepEqual(history.undo(),{title:'c'});assert.deepEqual(history.undo(),{title:'b'});assert.equal(history.undo(),null);
  history.reset({title:'external'});assert.equal(history.redo(),null);assert.equal(history.past.length,0);
});
