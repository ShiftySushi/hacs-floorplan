import {test} from 'node:test';
import assert from 'node:assert/strict';
import {packShaderStrings,unpackShaderStrings} from '../scripts/pack-shaders.mjs';
test('shader packing preserves preprocessor lines, escapes and dictionary-width boundaries',()=>{
  const strings=['#ifdef TEST\nvoid main(){ gl_Position=vec4(1.0); }\n#endif',...Array.from({length:2000},(_,i)=>`uniform vec3 colour${i};\n// ${i*i} "quoted" \\ newline\n`)];
  assert.deepEqual(unpackShaderStrings(packShaderStrings(strings)),strings);
});
