import assert from 'node:assert/strict';

// A bounded LZW dictionary shares repeated shader text across Three.js chunks.
// The synchronous decoder returns the original strings before shader creation.
export function unpackShaderStrings(base64){
  const raw=atob(base64),dictionary=Array.from({length:256},(_,i)=>String.fromCharCode(i));
  let previous='',result='',bits=0,buffer=0,offset=4;
  const count=raw.charCodeAt(0)|(raw.charCodeAt(1)<<8)|(raw.charCodeAt(2)<<16)|(raw.charCodeAt(3)<<24);
  for(let i=0;i<count;i++){const width=Math.min(16,Math.ceil(Math.log2(256+i)));while(bits<width){buffer|=raw.charCodeAt(offset++)<<bits;bits+=8;}const code=buffer&((1<<width)-1);buffer>>>=width;bits-=width;const entry=dictionary[code]??previous+previous[0];result+=entry;if(previous&&dictionary.length<65535)dictionary.push(previous+entry[0]);previous=entry;}
  return JSON.parse(result);
}
export function packShaderStrings(strings){
  const input=JSON.stringify(strings);assert(!/[^\x00-\xff]/.test(input),'Shader packing expects Latin-1 text');
  const dictionary=new Map(Array.from({length:256},(_,i)=>[String.fromCharCode(i),i])),codes=[];let previous='',next=256;
  for(const character of input){const joined=previous+character;if(dictionary.has(joined))previous=joined;else{codes.push(dictionary.get(previous));if(next<65535)dictionary.set(joined,next++);previous=character;}}
  if(previous)codes.push(dictionary.get(previous));const output=[];let buffer=0,bits=0;codes.forEach((code,i)=>{const width=Math.min(16,Math.ceil(Math.log2(256+i)));assert(code<2**width);buffer|=code<<bits;bits+=width;while(bits>=8){output.push(buffer&255);buffer>>>=8;bits-=8;}});if(bits)output.push(buffer&255);const header=Buffer.alloc(4);header.writeUInt32LE(codes.length);const bytes=Buffer.concat([header,Buffer.from(output)]);
  const packed=bytes.toString('base64');assert.deepEqual(unpackShaderStrings(packed),strings,'Shader packing must be lossless');return packed;
}
