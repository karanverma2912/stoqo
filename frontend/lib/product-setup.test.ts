import {it,expect} from 'vitest';
import {variantMatrix} from './product-setup';
it('creates distinct combinations and tolerates repeated size inputs',()=>{const rows=variantMatrix('S, M, s','Black, White','499','3');expect(rows).toHaveLength(4);expect(rows[0]).toMatchObject({size:'S',color:'Black',initial_quantity:'3'});expect(variantMatrix('M','','0','0')).toHaveLength(1)});
it('rejects empty and excessive combinations',()=>{expect(()=>variantMatrix('','','0','0')).toThrow();expect(()=>variantMatrix(Array.from({length:11},(_,i)=>String(i)).join(','),Array.from({length:10},(_,i)=>String(i)).join(','),'0','0')).toThrow('100')});
